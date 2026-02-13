"use client";

import { TutorialPage } from "@/components/guide/tutorial-page";
import { BookOpen } from "lucide-react";

export default function KnowledgeBaseGuidePage() {
  return (
    <TutorialPage
      icon={BookOpen}
      title="Knowledge Base Management"
      subtitle="Give your AI agents the information they need"
      intro="The knowledge base is where you store all the information your AI agents need to answer questions accurately. Upload product guides, FAQs, pricing sheets, or any document - GoRigo will process it and make it instantly available to your agents during calls."
      steps={[
        {
          title: "Navigate to the Knowledge Page",
          description: "Click 'Knowledge' in the sidebar under Management. You'll see an overview of all uploaded documents, their processing status, and chunk statistics.",
        },
        {
          title: "Click 'Upload Document'",
          description: "Hit the Upload button to open the document uploader. You can upload PDFs, Word documents, text files, or paste text directly.",
          detail: "Supported formats include PDF, DOCX, TXT, and you can also add content via URL.",
        },
        {
          title: "Choose the Source Type",
          description: "Select how you want to add content: Manual (type or paste text), Upload (drag and drop a file), URL (enter a web page address), or Audio (upload a recording to transcribe).",
        },
        {
          title: "Add Your Content",
          description: "Enter a clear document title and add your content using the chosen method. The title helps you identify the document later.",
          detail: "Use descriptive titles like 'Product Pricing 2026' or 'Returns Policy v3'.",
        },
        {
          title: "Wait for Processing",
          description: "After uploading, GoRigo automatically breaks your document into smaller chunks and creates embeddings. Watch the status change from 'Pending' to 'Processing' to 'Processed'.",
          detail: "Processing usually takes 30 seconds to a few minutes depending on document size.",
        },
        {
          title: "Check the Results",
          description: "Once processed, click the document row to see details: how many chunks were created, token count, embedding progress, and the source URL if applicable.",
        },
        {
          title: "Link to an Agent",
          description: "Go to your AI agent's settings and attach this knowledge base document. The agent will now reference this information during calls.",
        },
      ]}
      tips={[
        { text: "Keep documents focused on one topic each for better accuracy." },
        { text: "Update documents when your information changes - the agent always uses the latest version." },
        { text: "Shorter, well-structured documents work better than long, dense ones." },
        { text: "Use clear headings and bullet points in your documents for best results." },
        { text: "Check the 'failed' filter regularly to catch any documents that didn't process correctly." },
      ]}
      troubleshooting={[
        {
          problem: "My document is stuck in 'Processing' status",
          solution: "Large documents may take several minutes. If it's been more than 10 minutes, try deleting and re-uploading the document.",
        },
        {
          problem: "The document shows 'Failed' status",
          solution: "Check the file format is supported. Try re-uploading or converting to a different format (PDF usually works best).",
        },
        {
          problem: "My agent isn't using the knowledge base information",
          solution: "Make sure the document has finished processing (status: 'Processed') AND that it's linked to the agent in the agent settings.",
        },
      ]}
      keyTerms={[
        { term: "Chunk", definition: "A small section of your document that the AI can quickly search through." },
        { term: "Embedding", definition: "A way of converting text into numbers so the AI can understand and search it." },
        { term: "Token", definition: "A unit of text (roughly a word) used to measure document size." },
        { term: "RAG", definition: "Retrieval-Augmented Generation - the technology that lets AI reference your documents during conversations." },
      ]}
      imageSrc="/guide/knowledge-base-hero.png"
      imageAlt="Knowledge base management interface"
      videoSrc="/guide/knowledge-base-tutorial.mp4"
      videoTitle="Video: Uploading and Managing Your Knowledge Base - Step by Step"
      prevModule={{ title: "AI Agents", href: "/guide/agents" }}
      nextModule={{ title: "Clients & Partners", href: "/guide/clients" }}
    />
  );
}
