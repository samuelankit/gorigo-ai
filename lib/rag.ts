import { toFile } from "openai";
import { db } from "@/lib/db";
import { knowledgeDocuments, knowledgeChunks, responseCache } from "@/shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { getOpenAIClientForEmbeddings } from "@/lib/llm-router";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const MAX_RETRIEVAL_CHUNKS = 5;
const CACHE_SIMILARITY_THRESHOLD = 0.92;
const RETRIEVAL_SIMILARITY_THRESHOLD = 0.4;
const CACHE_TTL_HOURS = 72;
const MAX_AUDIO_SIZE_MB = 100;
const SUPPORTED_AUDIO_EXTENSIONS = ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "mpeg", "mpga"];

export function chunkText(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(/\s+/);
      currentChunk = words.slice(-CHUNK_OVERLAP).join(" ") + " " + sentence;
    } else {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  if (chunks.length === 0 && text.trim().length > 0) {
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
      chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
    }
  }

  return chunks;
}

export async function generateEmbedding(text: string, orgId?: number): Promise<number[]> {
  try {
    const client = await getOpenAIClientForEmbeddings();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function generateEmbeddings(texts: string[], orgId?: number): Promise<number[][]> {
  const truncated = texts.map((t) => t.slice(0, 8000));
  try {
    const client = await getOpenAIClientForEmbeddings();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncated,
      dimensions: EMBEDDING_DIMENSIONS,
    });
    return response.data.map((d) => d.embedding);
  } catch (error) {
    console.error("Batch embedding generation failed, falling back to sequential:", error);
    const results: number[][] = [];
    for (const text of truncated) {
      const emb = await generateEmbedding(text, orgId);
      results.push(emb);
    }
    return results;
  }
}

export async function processDocument(documentId: number, orgId: number): Promise<void> {
  const { hasInsufficientBalance, deductFromWallet } = await import("@/lib/wallet");

  const [doc] = await db
    .select()
    .from(knowledgeDocuments)
    .where(and(eq(knowledgeDocuments.id, documentId), eq(knowledgeDocuments.orgId, orgId)));

  if (!doc) throw new Error("Document not found");

  const insufficientBalance = await hasInsufficientBalance(orgId, 0.01);
  if (insufficientBalance) {
    await db
      .update(knowledgeDocuments)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, documentId));
    throw new Error("Insufficient wallet balance for document processing");
  }

  await db
    .update(knowledgeDocuments)
    .set({ status: "processing", updatedAt: new Date() })
    .where(eq(knowledgeDocuments.id, documentId));

  try {
    await db
      .delete(knowledgeChunks)
      .where(eq(knowledgeChunks.documentId, documentId));

    const chunks = chunkText(doc.content);

    if (chunks.length === 0) {
      await db
        .update(knowledgeDocuments)
        .set({ status: "ready", chunkCount: 0, updatedAt: new Date() })
        .where(eq(knowledgeDocuments.id, documentId));
      return;
    }

    const BATCH_SIZE = 10;
    let totalChunks = 0;
    let totalEmbeddingCalls = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await generateEmbeddings(batch, orgId);
      totalEmbeddingCalls++;

      for (let j = 0; j < batch.length; j++) {
        await db.insert(knowledgeChunks).values({
          documentId,
          orgId,
          content: batch[j],
          embedding: embeddings[j],
          chunkIndex: i + j,
          tokenCount: Math.ceil(batch[j].length / 4),
        });
        totalChunks++;
      }
    }

    const embeddingCostPerBatch = 0.002;
    const totalEmbeddingCost = totalEmbeddingCalls * embeddingCostPerBatch;
    if (totalEmbeddingCost > 0) {
      try {
        await deductFromWallet(
          orgId,
          totalEmbeddingCost,
          `Knowledge embedding: ${totalChunks} chunks (${totalEmbeddingCalls} batches) for doc #${documentId}`,
          "knowledge",
          String(documentId)
        );
      } catch (walletErr) {
        console.error(`Wallet deduction failed for embedding doc ${documentId}:`, walletErr);
      }
    }

    await db
      .update(knowledgeDocuments)
      .set({ status: "ready", chunkCount: totalChunks, updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, documentId));
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    await db
      .update(knowledgeDocuments)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, documentId));
    throw error;
  }
}

export async function searchKnowledge(
  orgId: number,
  query: string,
  limit: number = MAX_RETRIEVAL_CHUNKS
): Promise<{ content: string; similarity: number; documentId: number }[]> {
  const queryEmbedding = await generateEmbedding(query, orgId);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT 
      kc.content,
      kc.document_id,
      1 - (kc.embedding <=> ${embeddingStr}::vector) as similarity
    FROM knowledge_chunks kc
    WHERE kc.org_id = ${orgId}
      AND kc.embedding IS NOT NULL
      AND 1 - (kc.embedding <=> ${embeddingStr}::vector) > ${RETRIEVAL_SIMILARITY_THRESHOLD}
    ORDER BY kc.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return (results.rows as any[]).map((r) => ({
    content: r.content as string,
    similarity: parseFloat(r.similarity as string),
    documentId: r.document_id as number,
  }));
}

export async function checkResponseCache(
  orgId: number,
  query: string
): Promise<{ hit: boolean; response?: string; confidence?: number }> {
  try {
    const queryEmbedding = await generateEmbedding(query, orgId);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;

    const results = await db.execute(sql`
      SELECT 
        rc.id,
        rc.response_text,
        rc.confidence,
        1 - (rc.query_embedding <=> ${embeddingStr}::vector) as similarity
      FROM response_cache rc
      WHERE rc.org_id = ${orgId}
        AND rc.query_embedding IS NOT NULL
        AND (rc.expires_at IS NULL OR rc.expires_at > NOW())
        AND 1 - (rc.query_embedding <=> ${embeddingStr}::vector) > ${CACHE_SIMILARITY_THRESHOLD}
      ORDER BY rc.query_embedding <=> ${embeddingStr}::vector
      LIMIT 1
    `);

    if ((results.rows as any[]).length > 0) {
      const match = (results.rows as any[])[0];
      await db.execute(sql`
        UPDATE response_cache 
        SET hit_count = hit_count + 1, last_hit_at = NOW()
        WHERE id = ${match.id}
      `);

      return {
        hit: true,
        response: match.response_text as string,
        confidence: parseFloat(match.confidence as string),
      };
    }

    return { hit: false };
  } catch (error) {
    console.error("Response cache check failed:", error);
    return { hit: false };
  }
}

export async function cacheResponse(
  orgId: number,
  queryText: string,
  responseText: string,
  confidence: number
): Promise<void> {
  try {
    if (confidence < 0.7) return;

    const queryEmbedding = await generateEmbedding(queryText, orgId);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    await db.insert(responseCache).values({
      orgId,
      queryEmbedding,
      queryText,
      responseText,
      confidence: String(confidence),
      hitCount: 0,
      expiresAt,
    });
  } catch (error) {
    console.error("Failed to cache response:", error);
  }
}

export function buildRAGContext(
  retrievedChunks: { content: string; similarity: number }[]
): string {
  if (retrievedChunks.length === 0) return "";

  let context = "\n\nRelevant Knowledge Base Information:";
  retrievedChunks.forEach((chunk, i) => {
    context += `\n[${i + 1}] ${chunk.content}`;
  });
  context += "\n\nUse the above knowledge base information to provide accurate, specific answers. If the information doesn't fully cover the question, say what you know and offer to connect the caller with someone who can help.";

  return context;
}

export async function getRAGStats(orgId: number): Promise<{
  totalDocuments: number;
  processedDocuments: number;
  pendingDocuments: number;
  failedDocuments: number;
  totalChunks: number;
  cacheEntries: number;
  cacheHitRate: number;
}> {
  const [docStats] = await db
    .select({
      totalDocuments: sql<number>`count(*)`,
      processedDocuments: sql<number>`count(*) filter (where ${knowledgeDocuments.status} = 'ready')`,
      pendingDocuments: sql<number>`count(*) filter (where ${knowledgeDocuments.status} in ('pending', 'processing'))`,
      failedDocuments: sql<number>`count(*) filter (where ${knowledgeDocuments.status} = 'error')`,
    })
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.orgId, orgId));

  const [chunkStats] = await db
    .select({ totalChunks: sql<number>`count(*)` })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.orgId, orgId));

  const [cacheStats] = await db
    .select({
      cacheEntries: sql<number>`count(*)`,
      totalHits: sql<number>`coalesce(sum(${responseCache.hitCount}), 0)`,
    })
    .from(responseCache)
    .where(eq(responseCache.orgId, orgId));

  const totalEntries = Number(cacheStats.cacheEntries);
  const totalHits = Number(cacheStats.totalHits);
  const cacheHitRate = totalHits > 0 ? Math.round((totalHits / (totalHits + totalEntries)) * 100) : 0;

  return {
    totalDocuments: Number(docStats.totalDocuments),
    processedDocuments: Number(docStats.processedDocuments),
    pendingDocuments: Number(docStats.pendingDocuments),
    failedDocuments: Number(docStats.failedDocuments),
    totalChunks: Number(chunkStats.totalChunks),
    cacheEntries: totalEntries,
    cacheHitRate,
  };
}

export async function clearExpiredCache(): Promise<number> {
  const expired = await db
    .select({ id: responseCache.id })
    .from(responseCache)
    .where(sql`${responseCache.expiresAt} IS NOT NULL AND ${responseCache.expiresAt} < NOW()`);

  if (expired.length > 0) {
    await db
      .delete(responseCache)
      .where(sql`${responseCache.expiresAt} IS NOT NULL AND ${responseCache.expiresAt} < NOW()`);
  }

  return expired.length;
}

function isPrivateOrReservedHost(hostname: string): boolean {
  const privatePatterns = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /^0\./,
    /^169\.254\./,
    /^::1$/,
    /^fe80:/i,
    /^fc00:/i,
    /^fd/i,
    /\.local$/i,
    /\.internal$/i,
    /^metadata\./i,
    /^169\.254\.169\.254$/,
  ];
  return privatePatterns.some((p) => p.test(hostname));
}

export function validateAudioUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }
    if (isPrivateOrReservedHost(parsed.hostname)) {
      return { valid: false, error: "URLs pointing to private or internal networks are not allowed" };
    }
    if (parsed.port && !["80", "443", ""].includes(parsed.port)) {
      return { valid: false, error: "Only standard HTTP/HTTPS ports are allowed" };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: "URLs with embedded credentials are not allowed" };
    }
    const pathname = parsed.pathname.toLowerCase();
    const ext = pathname.split(".").pop() || "";
    if (ext && !SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Unsupported audio format. Supported: ${SUPPORTED_AUDIO_EXTENSIONS.join(", ")}` };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

function guessAudioFormat(url: string, contentType?: string): string {
  if (contentType) {
    const ct = contentType.toLowerCase();
    if (ct.includes("mp3") || ct.includes("mpeg")) return "mp3";
    if (ct.includes("mp4")) return "mp4";
    if (ct.includes("wav")) return "wav";
    if (ct.includes("webm")) return "webm";
    if (ct.includes("ogg")) return "ogg";
    if (ct.includes("m4a")) return "m4a";
  }
  const ext = new URL(url).pathname.toLowerCase().split(".").pop() || "";
  if (SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) return ext;
  return "mp3";
}

export async function fetchAudioFromUrl(url: string): Promise<{ buffer: Buffer; format: string; sizeBytes: number }> {
  const maxBytes = MAX_AUDIO_SIZE_MB * 1024 * 1024;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "GoRigo-AudioImport/1.0" },
      redirect: "follow",
    }).catch(() => null);

    if (headRes) {
      const cl = parseInt(headRes.headers.get("content-length") || "0");
      if (cl > maxBytes) {
        throw new Error(`Audio file too large (${Math.round(cl / 1024 / 1024)}MB). Maximum: ${MAX_AUDIO_SIZE_MB}MB`);
      }

      const finalUrl = headRes.url;
      if (finalUrl && finalUrl !== url) {
        try {
          const redirected = new URL(finalUrl);
          if (isPrivateOrReservedHost(redirected.hostname)) {
            throw new Error("Redirect to private/internal network blocked");
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes("blocked")) throw e;
        }
      }
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "GoRigo-AudioImport/1.0" },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: HTTP ${response.status} ${response.statusText}`);
    }

    if (response.url) {
      try {
        const finalHost = new URL(response.url).hostname;
        if (isPrivateOrReservedHost(finalHost)) {
          throw new Error("Redirect to private/internal network blocked");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("blocked")) throw e;
      }
    }

    const contentType = response.headers.get("content-type") || "";
    const contentLength = parseInt(response.headers.get("content-length") || "0");

    if (contentLength > maxBytes) {
      throw new Error(`Audio file too large (${Math.round(contentLength / maxBytes * 100)}MB). Maximum: ${MAX_AUDIO_SIZE_MB}MB`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxBytes) {
      throw new Error(`Audio file too large (${Math.round(buffer.length / 1024 / 1024)}MB). Maximum: ${MAX_AUDIO_SIZE_MB}MB`);
    }

    const format = guessAudioFormat(url, contentType);
    return { buffer, format, sizeBytes: buffer.length };
  } finally {
    clearTimeout(timeout);
  }
}

export async function transcribeAudio(audioBuffer: Buffer, format: string, orgId?: number): Promise<string> {
  const client = await getOpenAIClientForEmbeddings();
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await client.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
  });
  return response.text;
}

export async function importAudioFromUrl(
  url: string,
  title: string,
  orgId: number
): Promise<{ documentId: number; transcript: string }> {
  const [doc] = await db
    .insert(knowledgeDocuments)
    .values({
      orgId,
      title,
      content: "",
      sourceType: "audio_url",
      sourceUrl: url,
      status: "transcribing",
    })
    .returning();

  try {
    const { buffer, format } = await fetchAudioFromUrl(url);

    const transcript = await transcribeAudio(buffer, format, orgId);

    if (!transcript || transcript.trim().length === 0) {
      await db
        .update(knowledgeDocuments)
        .set({ status: "error", content: "No speech detected in audio", updatedAt: new Date() })
        .where(eq(knowledgeDocuments.id, doc.id));
      throw new Error("No speech detected in audio file");
    }

    const { deductFromWallet } = await import("@/lib/wallet");
    const transcriptionCost = 0.10;
    try {
      await deductFromWallet(
        orgId,
        transcriptionCost,
        `Audio transcription: ${title}`,
        "transcription",
        String(doc.id)
      );
    } catch (walletErr) {
      console.error(`Wallet deduction failed for transcription doc ${doc.id}:`, walletErr);
    }

    await db
      .update(knowledgeDocuments)
      .set({ content: transcript, status: "pending", updatedAt: new Date() })
      .where(eq(knowledgeDocuments.id, doc.id));

    await processDocument(doc.id, orgId);

    return { documentId: doc.id, transcript };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error during audio import";
    await db
      .update(knowledgeDocuments)
      .set({
        status: "error",
        content: `Import failed: ${errorMessage}`,
        updatedAt: new Date(),
      })
      .where(eq(knowledgeDocuments.id, doc.id));
    throw error;
  }
}
