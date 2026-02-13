module.exports = [
"[project]/lib/db.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "checkDatabaseHealth",
    ()=>checkDatabaseHealth,
    "db",
    ()=>db,
    "getPoolStats",
    ()=>getPoolStats
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/node-postgres/driver.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__ = __turbopack_context__.i("[externals]/pg [external] (pg, esm_import, [project]/node_modules/pg)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
const isProduction = ("TURBOPACK compile-time value", "development") === "production";
const pool = new __TURBOPACK__imported__module__$5b$externals$5d2f$pg__$5b$external$5d$__$28$pg$2c$__esm_import$2c$__$5b$project$5d2f$node_modules$2f$pg$29$__["default"].Pool({
    connectionString: process.env.DATABASE_URL,
    max: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : 10,
    min: ("TURBOPACK compile-time falsy", 0) ? "TURBOPACK unreachable" : 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 30_000,
    query_timeout: 30_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: false
});
pool.on("error", (err)=>{
    console.error("[DB] Unexpected pool error:", err.message);
});
pool.on("connect", (client)=>{
    client.on("error", (err)=>{
        console.error("[DB] Client connection error:", err.message);
    });
});
let healthCheckInterval = null;
function startHealthCheck() {
    if (healthCheckInterval) return;
    healthCheckInterval = setInterval(async ()=>{
        try {
            const client = await pool.connect();
            await client.query("SELECT 1");
            client.release();
        } catch (err) {
            console.error("[DB] Health check failed:", err instanceof Error ? err.message : err);
        }
    }, 60_000);
    if (healthCheckInterval.unref) healthCheckInterval.unref();
}
startHealthCheck();
async function getPoolStats() {
    return {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount
    };
}
async function checkDatabaseHealth() {
    const start = Date.now();
    try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        return {
            healthy: true,
            latencyMs: Date.now() - start
        };
    } catch (err) {
        return {
            healthy: false,
            latencyMs: Date.now() - start,
            error: err instanceof Error ? err.message : "Unknown error"
        };
    }
}
const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$node$2d$postgres$2f$driver$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["drizzle"])(pool);
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/shared/models/chat.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "conversations",
    ()=>conversations,
    "insertConversationSchema",
    ()=>insertConversationSchema,
    "insertMessageSchema",
    ()=>insertMessageSchema,
    "messages",
    ()=>messages
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/serial.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-zod/index.mjs [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [instrumentation] (ecmascript)");
;
;
;
const conversations = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("conversations", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull()
});
const messages = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("messages", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    conversationId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("conversation_id").notNull().references(()=>conversations.id, {
        onDelete: "cascade"
    }),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("role").notNull(),
    content: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("content").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").default(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`CURRENT_TIMESTAMP`).notNull()
});
const insertConversationSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(conversations).omit({
    id: true,
    createdAt: true
});
const insertMessageSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(messages).omit({
    id: true,
    createdAt: true
});
}),
"[project]/shared/schema.ts [instrumentation] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "affiliateClicks",
    ()=>affiliateClicks,
    "affiliateCommissions",
    ()=>affiliateCommissions,
    "affiliatePayouts",
    ()=>affiliatePayouts,
    "affiliates",
    ()=>affiliates,
    "agentFlows",
    ()=>agentFlows,
    "agents",
    ()=>agents,
    "apiKeys",
    ()=>apiKeys,
    "auditLog",
    ()=>auditLog,
    "billingLedger",
    ()=>billingLedger,
    "billingPlans",
    ()=>billingPlans,
    "callHops",
    ()=>callHops,
    "callLogs",
    ()=>callLogs,
    "campaigns",
    ()=>campaigns,
    "consentRecords",
    ()=>consentRecords,
    "costConfig",
    ()=>costConfig,
    "demoLeads",
    ()=>demoLeads,
    "deploymentModelChanges",
    ()=>deploymentModelChanges,
    "distributionLedger",
    ()=>distributionLedger,
    "doNotCallList",
    ()=>doNotCallList,
    "failedDistributions",
    ()=>failedDistributions,
    "finAccounts",
    ()=>finAccounts,
    "finAuditLog",
    ()=>finAuditLog,
    "finBillLines",
    ()=>finBillLines,
    "finBills",
    ()=>finBills,
    "finCreditNoteLines",
    ()=>finCreditNoteLines,
    "finCreditNotes",
    ()=>finCreditNotes,
    "finCustomers",
    ()=>finCustomers,
    "finInvoiceLines",
    ()=>finInvoiceLines,
    "finInvoices",
    ()=>finInvoices,
    "finJournalEntries",
    ()=>finJournalEntries,
    "finJournalLines",
    ()=>finJournalLines,
    "finPayments",
    ()=>finPayments,
    "finSuppliers",
    ()=>finSuppliers,
    "finTaxCodes",
    ()=>finTaxCodes,
    "finWorkspaces",
    ()=>finWorkspaces,
    "insertAffiliateClickSchema",
    ()=>insertAffiliateClickSchema,
    "insertAffiliateCommissionSchema",
    ()=>insertAffiliateCommissionSchema,
    "insertAffiliatePayoutSchema",
    ()=>insertAffiliatePayoutSchema,
    "insertAffiliateSchema",
    ()=>insertAffiliateSchema,
    "insertAgentFlowSchema",
    ()=>insertAgentFlowSchema,
    "insertAgentSchema",
    ()=>insertAgentSchema,
    "insertApiKeySchema",
    ()=>insertApiKeySchema,
    "insertAuditLogSchema",
    ()=>insertAuditLogSchema,
    "insertBillingLedgerSchema",
    ()=>insertBillingLedgerSchema,
    "insertBillingPlanSchema",
    ()=>insertBillingPlanSchema,
    "insertCallHopSchema",
    ()=>insertCallHopSchema,
    "insertCallLogSchema",
    ()=>insertCallLogSchema,
    "insertCampaignSchema",
    ()=>insertCampaignSchema,
    "insertConsentRecordSchema",
    ()=>insertConsentRecordSchema,
    "insertCostConfigSchema",
    ()=>insertCostConfigSchema,
    "insertCreditNoteLineSchema",
    ()=>insertCreditNoteLineSchema,
    "insertCreditNoteSchema",
    ()=>insertCreditNoteSchema,
    "insertDemoLeadSchema",
    ()=>insertDemoLeadSchema,
    "insertDeploymentModelChangeSchema",
    ()=>insertDeploymentModelChangeSchema,
    "insertDistributionLedgerSchema",
    ()=>insertDistributionLedgerSchema,
    "insertDoNotCallSchema",
    ()=>insertDoNotCallSchema,
    "insertFailedDistributionSchema",
    ()=>insertFailedDistributionSchema,
    "insertFinAccountSchema",
    ()=>insertFinAccountSchema,
    "insertFinAuditLogSchema",
    ()=>insertFinAuditLogSchema,
    "insertFinBillLineSchema",
    ()=>insertFinBillLineSchema,
    "insertFinBillSchema",
    ()=>insertFinBillSchema,
    "insertFinCustomerSchema",
    ()=>insertFinCustomerSchema,
    "insertFinInvoiceLineSchema",
    ()=>insertFinInvoiceLineSchema,
    "insertFinInvoiceSchema",
    ()=>insertFinInvoiceSchema,
    "insertFinJournalEntrySchema",
    ()=>insertFinJournalEntrySchema,
    "insertFinJournalLineSchema",
    ()=>insertFinJournalLineSchema,
    "insertFinPaymentSchema",
    ()=>insertFinPaymentSchema,
    "insertFinSupplierSchema",
    ()=>insertFinSupplierSchema,
    "insertFinTaxCodeSchema",
    ()=>insertFinTaxCodeSchema,
    "insertFinWorkspaceSchema",
    ()=>insertFinWorkspaceSchema,
    "insertJobSchema",
    ()=>insertJobSchema,
    "insertKnowledgeChunkSchema",
    ()=>insertKnowledgeChunkSchema,
    "insertKnowledgeDocumentSchema",
    ()=>insertKnowledgeDocumentSchema,
    "insertNotificationSchema",
    ()=>insertNotificationSchema,
    "insertOrgMemberSchema",
    ()=>insertOrgMemberSchema,
    "insertOrgSchema",
    ()=>insertOrgSchema,
    "insertPartnerClientSchema",
    ()=>insertPartnerClientSchema,
    "insertPartnerSchema",
    ()=>insertPartnerSchema,
    "insertPlatformSettingSchema",
    ()=>insertPlatformSettingSchema,
    "insertRateCardSchema",
    ()=>insertRateCardSchema,
    "insertResponseCacheSchema",
    ()=>insertResponseCacheSchema,
    "insertSessionSchema",
    ()=>insertSessionSchema,
    "insertSubscriptionSchema",
    ()=>insertSubscriptionSchema,
    "insertTwilioPhoneNumberSchema",
    ()=>insertTwilioPhoneNumberSchema,
    "insertUsageRecordSchema",
    ()=>insertUsageRecordSchema,
    "insertUserSchema",
    ()=>insertUserSchema,
    "insertWalletSchema",
    ()=>insertWalletSchema,
    "insertWalletTransactionSchema",
    ()=>insertWalletTransactionSchema,
    "insertWebhookSchema",
    ()=>insertWebhookSchema,
    "jobs",
    ()=>jobs,
    "knowledgeChunks",
    ()=>knowledgeChunks,
    "knowledgeDocuments",
    ()=>knowledgeDocuments,
    "notifications",
    ()=>notifications,
    "orgMembers",
    ()=>orgMembers,
    "orgs",
    ()=>orgs,
    "partnerClients",
    ()=>partnerClients,
    "partners",
    ()=>partners,
    "passwordResetTokens",
    ()=>passwordResetTokens,
    "platformSettings",
    ()=>platformSettings,
    "rateCards",
    ()=>rateCards,
    "responseCache",
    ()=>responseCache,
    "sessions",
    ()=>sessions,
    "subscriptions",
    ()=>subscriptions,
    "twilioPhoneNumbers",
    ()=>twilioPhoneNumbers,
    "usageRecords",
    ()=>usageRecords,
    "users",
    ()=>users,
    "walletTransactions",
    ()=>walletTransactions,
    "wallets",
    ()=>wallets,
    "webhooks",
    ()=>webhooks
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/table.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/text.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/serial.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/integer.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/boolean.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/timestamp.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/jsonb.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$vector_extension$2f$vector$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/columns/numeric.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/pg-core/indexes.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-zod/index.mjs [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$models$2f$chat$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/shared/models/chat.ts [instrumentation] (ecmascript)");
;
;
const users = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("users", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("email").unique().notNull(),
    password: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("password").notNull(),
    businessName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("business_name").notNull(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    deletedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("deleted_at"),
    isDemo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_demo").default(false),
    failedLoginAttempts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("failed_login_attempts").default(0),
    lockedUntil: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("locked_until"),
    globalRole: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("global_role").default("CLIENT")
});
const sessions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("sessions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    token: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("token").unique().notNull(),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at").notNull(),
    ipAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ip_address"),
    userAgent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("user_agent"),
    lastSeenAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("last_seen_at").defaultNow(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_sessions_user_id").on(table.userId)
    ]);
const orgs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("orgs", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    timezone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("timezone").default("UTC"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    channelType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("channel_type").default("d2c"),
    referredByAffiliateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("referred_by_affiliate_id"),
    maxConcurrentCalls: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_concurrent_calls").default(5),
    minCallBalance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("min_call_balance", {
        precision: 12,
        scale: 2
    }).default("1.00"),
    businessHours: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("business_hours"),
    voicemailEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("voicemail_enabled").default(false),
    voicemailGreeting: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("voicemail_greeting"),
    byokOpenaiKey: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_openai_key"),
    byokOpenaiBaseUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_openai_base_url"),
    byokTwilioSid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_twilio_sid"),
    byokTwilioToken: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_twilio_token"),
    byokTwilioPhone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_twilio_phone"),
    byokMode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("byok_mode").default("platform"),
    deploymentModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("deployment_model").default("managed"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const orgMembers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("org_members", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    role: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("role").notNull().default("OWNER")
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_org_members_org_id").on(table.orgId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_org_members_user_id").on(table.userId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("uq_org_members_org_user").on(table.orgId, table.userId)
    ]);
const agents = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("agents", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull().default("AI Assistant"),
    greeting: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("greeting").default("Hello, thank you for calling. How can I help you today?"),
    businessDescription: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("business_description"),
    inboundEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("inbound_enabled").default(true),
    outboundEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("outbound_enabled").default(false),
    roles: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("roles").default("receptionist"),
    faqEntries: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("faq_entries").default([]),
    handoffNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("handoff_number"),
    handoffTrigger: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("handoff_trigger").default("transfer"),
    voicePreference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("voice_preference").default("professional"),
    negotiationEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("negotiation_enabled").default(false),
    negotiationGuardrails: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("negotiation_guardrails"),
    complianceDisclosure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("compliance_disclosure").default(true),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow(),
    handoffEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("handoff_enabled").default(true),
    handoffTargetType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("handoff_target_type").default("phone"),
    handoffTargetValue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("handoff_target_value"),
    handoffConditions: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("handoff_conditions"),
    maxTurns: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_turns").default(10),
    confidenceThreshold: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("confidence_threshold", {
        precision: 5,
        scale: 2
    }).default("0.55"),
    retentionDaysCallLogs: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("retention_days_call_logs").default(90),
    retentionDaysRecordings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("retention_days_recordings").default(30),
    agentType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("agent_type").default("general"),
    departmentName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("department_name"),
    displayOrder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("display_order").default(0),
    isRouter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_router").default(false),
    routingConfig: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("routing_config"),
    parentAgentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("parent_agent_id"),
    systemPrompt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("system_prompt"),
    escalationRules: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("escalation_rules"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("active"),
    language: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("language").default("en-GB"),
    voiceName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("voice_name").default("Polly.Amy"),
    speechModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("speech_model").default("default")
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_agents_org_id").on(table.orgId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_agents_user_id").on(table.userId)
    ]);
const callLogs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("call_logs", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    agentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("agent_id").notNull().references(()=>agents.id),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    direction: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("direction").notNull(),
    callerNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("caller_number"),
    duration: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("duration").default(0),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("completed"),
    summary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("summary"),
    transcript: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("transcript"),
    leadCaptured: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("lead_captured").default(false),
    leadName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("lead_name"),
    leadEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("lead_email"),
    leadPhone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("lead_phone"),
    appointmentBooked: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("appointment_booked").default(false),
    handoffTriggered: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("handoff_triggered").default(false),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    providerCallId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("provider_call_id").unique(),
    aiDisclosurePlayed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("ai_disclosure_played").default(false),
    aiDisclosureVersion: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ai_disclosure_version"),
    currentState: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("current_state").default("GREETING"),
    turnCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("turn_count").default(0),
    lastConfidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("last_confidence", {
        precision: 5,
        scale: 2
    }),
    handoffReason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("handoff_reason"),
    handoffAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("handoff_at"),
    finalOutcome: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("final_outcome"),
    startedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("started_at").defaultNow(),
    endedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("ended_at"),
    recordingUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("recording_url"),
    recordingSid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("recording_sid"),
    twilioCallSid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("twilio_call_sid"),
    callCost: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("call_cost", {
        precision: 12,
        scale: 2
    }),
    connectedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("connected_at"),
    sentimentScore: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("sentiment_score", {
        precision: 5,
        scale: 2
    }),
    sentimentLabel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("sentiment_label"),
    sentimentHistory: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("sentiment_history").default([]),
    qualityScore: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("quality_score", {
        precision: 5,
        scale: 2
    }),
    qualityBreakdown: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("quality_breakdown"),
    csatPrediction: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("csat_prediction", {
        precision: 5,
        scale: 2
    }),
    resolutionStatus: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("resolution_status"),
    tags: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("tags").default([]),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    billedDeploymentModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("billed_deployment_model"),
    billedRatePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("billed_rate_per_minute", {
        precision: 12,
        scale: 6
    })
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_call_logs_org_id").on(table.orgId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_call_logs_created_at").on(table.createdAt)
    ]);
const usageRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("usage_records", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    month: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("month").notNull(),
    minutesUsed: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("minutes_used", {
        precision: 10,
        scale: 2
    }).default("0"),
    minuteLimit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("minute_limit").default(500),
    callCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("call_count").default(0),
    leadsCaptured: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("leads_captured").default(0),
    spendingCap: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("spending_cap", {
        precision: 12,
        scale: 2
    })
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_usage_records_org_month").on(table.orgId, table.month),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("uq_usage_records_org_month_user").on(table.orgId, table.month, table.userId)
    ]);
const billingPlans = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("billing_plans", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    minutesIncluded: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("minutes_included").notNull(),
    pricePerMonth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("price_per_month", {
        precision: 12,
        scale: 2
    }).notNull(),
    overagePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("overage_per_minute", {
        precision: 10,
        scale: 4
    }).notNull()
});
const subscriptions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("subscriptions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    planId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("plan_id").notNull().references(()=>billingPlans.id),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("active"),
    startDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("start_date").defaultNow(),
    endDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("end_date")
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_subscriptions_org_id").on(table.orgId)
    ]);
const billingLedger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("billing_ledger", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    callLogId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("call_log_id").unique().references(()=>callLogs.id),
    providerCallId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("provider_call_id"),
    startedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("started_at"),
    connectedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("connected_at"),
    endedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("ended_at"),
    billableSeconds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("billable_seconds").default(0),
    minChargeSeconds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("min_charge_seconds").default(30),
    ratePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("rate_per_minute", {
        precision: 10,
        scale: 4
    }),
    cost: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("cost", {
        precision: 12,
        scale: 2
    }).default("0"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("provider"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_billing_ledger_org_id").on(table.orgId)
    ]);
const jobs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("jobs", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull(),
    payload: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("payload"),
    runAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("run_at").defaultNow(),
    attempts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("attempts").default(0),
    maxAttempts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_attempts").default(3),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    result: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("result"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const partners = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("partners", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    contactEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("contact_email").notNull(),
    contactName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("contact_name"),
    brandingLogo: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("branding_logo"),
    brandingPrimaryColor: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("branding_primary_color").default("#3B82F6"),
    brandingCompanyName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("branding_company_name"),
    whitelabelMode: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("whitelabel_mode").default("co-branded"),
    customDomain: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("custom_domain"),
    tier: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("tier").default("BRONZE"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("active"),
    partnerType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("partner_type").default("business_partner"),
    wholesaleRatePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("wholesale_rate_per_minute", {
        precision: 10,
        scale: 4
    }).default("0.05"),
    resellerRatePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("reseller_rate_per_minute", {
        precision: 10,
        scale: 4
    }).default("0.04"),
    monthlyPlatformFee: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("monthly_platform_fee", {
        precision: 12,
        scale: 2
    }).default("0"),
    revenueSharePercent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("revenue_share_percent", {
        precision: 5,
        scale: 2
    }).default("0"),
    maxClients: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_clients").default(50),
    maxResellers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_resellers").default(20),
    featuresEnabled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("features_enabled").default([
        "voice_inbound",
        "call_logs",
        "agent_config"
    ]),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    parentPartnerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("parent_partner_id"),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").references(()=>orgs.id),
    canCreateResellers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("can_create_resellers").default(true),
    canSellDirect: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("can_sell_direct").default(true),
    canCreateAffiliates: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("can_create_affiliates").default(true),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow(),
    suspendedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("suspended_at")
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_partners_org_id").on(table.orgId)
    ]);
const partnerClients = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("partner_clients", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    partnerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("partner_id").notNull().references(()=>partners.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("active"),
    retailRatePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("retail_rate_per_minute", {
        precision: 10,
        scale: 4
    }),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_partner_clients_org_id").on(table.orgId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_partner_clients_partner_id").on(table.partnerId)
    ]);
const affiliates = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("affiliates", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("code").unique().notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("email").notNull(),
    ownerType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("owner_type").notNull().default("platform"),
    ownerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("owner_id"),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").references(()=>users.id),
    commissionRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("commission_rate", {
        precision: 5,
        scale: 2
    }).default("10"),
    commissionType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("commission_type").default("percentage"),
    cookieDurationDays: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("cookie_duration_days").default(30),
    totalClicks: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("total_clicks").default(0),
    totalSignups: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("total_signups").default(0),
    totalEarnings: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_earnings", {
        precision: 12,
        scale: 2
    }).default("0"),
    pendingPayout: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("pending_payout", {
        precision: 12,
        scale: 2
    }).default("0"),
    lifetimePayouts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("lifetime_payouts", {
        precision: 12,
        scale: 2
    }).default("0"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
});
const affiliateClicks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("affiliate_clicks", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    affiliateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("affiliate_id").notNull().references(()=>affiliates.id),
    ipAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ip_address"),
    userAgent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("user_agent"),
    referrerUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("referrer_url"),
    landingPage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("landing_page"),
    convertedToSignup: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("converted_to_signup").default(false),
    convertedOrgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("converted_org_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_affiliate_clicks_affiliate_id").on(table.affiliateId)
    ]);
const affiliateCommissions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("affiliate_commissions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    affiliateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("affiliate_id").notNull().references(()=>affiliates.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    walletTransactionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("wallet_transaction_id"),
    sourceAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("source_amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    commissionRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("commission_rate", {
        precision: 5,
        scale: 2
    }).notNull(),
    commissionAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("commission_amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("uq_aff_commission_txn").on(table.walletTransactionId, table.affiliateId)
    ]);
const affiliatePayouts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("affiliate_payouts", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    affiliateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("affiliate_id").notNull().references(()=>affiliates.id),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    method: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("method").default("wallet_credit"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    processedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("processed_by"),
    processedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("processed_at"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const agentFlows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("agent_flows", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull().default("Default Flow"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    nodes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("nodes").default([]),
    edges: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("edges").default([]),
    entryAgentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("entry_agent_id").references(()=>agents.id),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    version: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("version").default(1),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_agent_flows_org_id").on(table.orgId)
    ]);
const callHops = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("call_hops", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    callLogId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("call_log_id").notNull().references(()=>callLogs.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    fromAgentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("from_agent_id").references(()=>agents.id),
    toAgentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("to_agent_id").notNull().references(()=>agents.id),
    hopOrder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("hop_order").notNull().default(0),
    reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reason"),
    durationSeconds: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("duration_seconds").default(0),
    hopCost: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("hop_cost", {
        precision: 12,
        scale: 2
    }).default("0"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("completed"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const platformSettings = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("platform_settings", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    key: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("key").unique().notNull(),
    value: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("value").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
});
const auditLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("audit_log", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    actorId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("actor_id"),
    actorEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("actor_email"),
    action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("action").notNull(),
    entityType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("entity_type").notNull(),
    entityId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("entity_id"),
    details: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("details"),
    ipAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ip_address"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_audit_log_created_at").on(table.createdAt)
    ]);
const knowledgeDocuments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("knowledge_documents", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    content: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("content").notNull(),
    sourceType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("source_type").default("manual"),
    sourceUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("source_url"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    chunkCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("chunk_count").default(0),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_knowledge_docs_org_id").on(table.orgId)
    ]);
const knowledgeChunks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("knowledge_chunks", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    documentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("document_id").notNull().references(()=>knowledgeDocuments.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    content: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("content").notNull(),
    embedding: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$vector_extension$2f$vector$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["vector"])("embedding", {
        dimensions: 768
    }),
    chunkIndex: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("chunk_index").default(0),
    tokenCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("token_count").default(0),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_knowledge_chunks_doc_id").on(table.documentId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_knowledge_chunks_org_id").on(table.orgId)
    ]);
const responseCache = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("response_cache", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    queryEmbedding: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$vector_extension$2f$vector$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["vector"])("query_embedding", {
        dimensions: 768
    }),
    queryText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("query_text").notNull(),
    responseText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("response_text").notNull(),
    confidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("confidence", {
        precision: 5,
        scale: 2
    }).default("0"),
    hitCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("hit_count").default(0),
    lastHitAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("last_hit_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at")
});
const doNotCallList = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("do_not_call_list", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    phoneNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone_number").notNull(),
    reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reason"),
    source: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("source"),
    addedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("added_by").references(()=>users.id),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_dnc_org_phone").on(table.orgId, table.phoneNumber)
    ]);
const consentRecords = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("consent_records", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    phoneNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone_number").notNull(),
    consentType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("consent_type").notNull(),
    consentGiven: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("consent_given").notNull(),
    consentMethod: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("consent_method"),
    consentText: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("consent_text"),
    ipAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ip_address"),
    callLogId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("call_log_id").references(()=>callLogs.id),
    revokedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("revoked_at"),
    revokedReason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("revoked_reason"),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_consent_org_phone").on(table.orgId, table.phoneNumber)
    ]);
const insertUserSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(users).omit({
    id: true,
    createdAt: true
});
const insertSessionSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(sessions).omit({
    id: true
});
const insertOrgSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(orgs).omit({
    id: true,
    createdAt: true
});
const insertOrgMemberSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(orgMembers).omit({
    id: true
});
const insertAgentSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(agents).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertCallLogSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(callLogs).omit({
    id: true,
    createdAt: true
});
const insertUsageRecordSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(usageRecords).omit({
    id: true
});
const insertBillingPlanSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(billingPlans).omit({
    id: true
});
const insertSubscriptionSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(subscriptions).omit({
    id: true,
    startDate: true
});
const insertBillingLedgerSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(billingLedger).omit({
    id: true,
    createdAt: true
});
const insertJobSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(jobs).omit({
    id: true,
    createdAt: true
});
const insertPartnerSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(partners).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertPartnerClientSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(partnerClients).omit({
    id: true,
    createdAt: true
});
const insertPlatformSettingSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(platformSettings).omit({
    id: true,
    updatedAt: true
});
const insertAuditLogSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(auditLog).omit({
    id: true,
    createdAt: true
});
const insertKnowledgeDocumentSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(knowledgeDocuments).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertKnowledgeChunkSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(knowledgeChunks).omit({
    id: true,
    createdAt: true
});
const insertResponseCacheSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(responseCache).omit({
    id: true,
    createdAt: true
});
const wallets = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("wallets", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").unique().notNull().references(()=>orgs.id),
    balance: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("balance", {
        precision: 12,
        scale: 2
    }).default("0").notNull(),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP").notNull(),
    lowBalanceThreshold: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("low_balance_threshold", {
        precision: 12,
        scale: 2
    }).default("10"),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
});
const walletTransactions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("wallet_transactions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull(),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    balanceBefore: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("balance_before", {
        precision: 12,
        scale: 2
    }).notNull(),
    balanceAfter: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("balance_after", {
        precision: 12,
        scale: 2
    }).notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    referenceType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reference_type"),
    referenceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reference_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_wallet_txn_org_id").on(table.orgId),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_wallet_txn_created_at").on(table.createdAt)
    ]);
const costConfig = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("cost_config", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    category: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("category").notNull(),
    provider: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("provider").default("gorigo"),
    unitCostAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("unit_cost_amount", {
        precision: 10,
        scale: 4
    }).notNull(),
    unitType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("unit_type").notNull(),
    markupPercent: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("markup_percent", {
        precision: 5,
        scale: 2
    }).default("40"),
    sellingPrice: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("selling_price", {
        precision: 12,
        scale: 2
    }),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    effectiveFrom: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("effective_from").defaultNow(),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const rateCards = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("rate_cards", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    deploymentModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("deployment_model").notNull(),
    category: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("category").notNull(),
    label: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("label").notNull(),
    ratePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("rate_per_minute", {
        precision: 10,
        scale: 4
    }).notNull(),
    platformFeePerMinute: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("platform_fee_per_minute", {
        precision: 10,
        scale: 4
    }).notNull(),
    includesAiCost: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("includes_ai_cost").default(true),
    includesTelephonyCost: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("includes_telephony_cost").default(true),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
});
const insertRateCardSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(rateCards).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertWalletSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(wallets).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertWalletTransactionSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(walletTransactions).omit({
    id: true,
    createdAt: true
});
const insertCostConfigSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(costConfig).omit({
    id: true,
    createdAt: true
});
const insertAgentFlowSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(agentFlows).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertCallHopSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(callHops).omit({
    id: true,
    createdAt: true
});
const insertAffiliateSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(affiliates).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertAffiliateClickSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(affiliateClicks).omit({
    id: true,
    createdAt: true
});
const insertAffiliateCommissionSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(affiliateCommissions).omit({
    id: true,
    createdAt: true
});
const insertAffiliatePayoutSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(affiliatePayouts).omit({
    id: true,
    createdAt: true
});
const twilioPhoneNumbers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("twilio_phone_numbers", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    phoneNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone_number").unique().notNull(),
    friendlyName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("friendly_name"),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").references(()=>orgs.id),
    twilioSid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("twilio_sid"),
    capabilities: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("capabilities").default({
        voice: true,
        sms: false
    }),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    assignedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("assigned_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const distributionLedger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("distribution_ledger", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    billingLedgerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("billing_ledger_id").references(()=>billingLedger.id),
    walletTransactionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("wallet_transaction_id"),
    totalAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    platformAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("platform_amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    partnerAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("partner_amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    partnerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("partner_id"),
    resellerAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("reseller_amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    resellerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("reseller_id"),
    affiliateAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("affiliate_amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    affiliateId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("affiliate_id"),
    channel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("channel").notNull().default("d2c"),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("completed"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const failedDistributions = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("failed_distributions", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    deductionAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("deduction_amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    walletTransactionId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("wallet_transaction_id"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    errorMessage: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("error_message"),
    retryCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("retry_count").default(0),
    maxRetries: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_retries").default(3),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("pending"),
    resolvedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("resolved_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertDistributionLedgerSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(distributionLedger).omit({
    id: true,
    createdAt: true
});
const insertFailedDistributionSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(failedDistributions).omit({
    id: true,
    createdAt: true
});
const insertTwilioPhoneNumberSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(twilioPhoneNumbers).omit({
    id: true,
    createdAt: true
});
const passwordResetTokens = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("password_reset_tokens", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    token: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("token").unique().notNull(),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at").notNull(),
    usedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("used_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_pwd_reset_user_id").on(table.userId)
    ]);
const insertDoNotCallSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(doNotCallList).omit({
    id: true,
    createdAt: true
});
const insertConsentRecordSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(consentRecords).omit({
    id: true,
    createdAt: true
});
const campaigns = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("campaigns", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    agentId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("agent_id").references(()=>agents.id),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").default("draft"),
    contactList: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("contact_list").default([]),
    completedContacts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("completed_contacts").default([]),
    scheduledAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("scheduled_at"),
    startedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("started_at"),
    completedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("completed_at"),
    totalContacts: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("total_contacts").default(0),
    completedCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("completed_count").default(0),
    failedCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("failed_count").default(0),
    callInterval: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("call_interval").default(30),
    maxRetries: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("max_retries").default(1),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertCampaignSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(campaigns).omit({
    id: true,
    createdAt: true
});
const webhooks = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("webhooks", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    url: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("url").notNull(),
    events: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("events").array().default([]),
    secret: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("secret"),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    lastTriggered: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("last_triggered"),
    failureCount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("failure_count").default(0),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertWebhookSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(webhooks).omit({
    id: true,
    createdAt: true,
    lastTriggered: true,
    failureCount: true
});
const notifications = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("notifications", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").references(()=>orgs.id),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull(),
    title: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("title").notNull(),
    message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("message").notNull(),
    isRead: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_read").default(false),
    actionUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("action_url"),
    metadata: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("metadata"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["index"])("idx_notifications_user_id").on(table.userId)
    ]);
const insertNotificationSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(notifications).omit({
    id: true,
    createdAt: true,
    isRead: true
});
const apiKeys = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("api_keys", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id").notNull().references(()=>users.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    keyPrefix: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("key_prefix").notNull(),
    keyHash: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("key_hash").notNull(),
    lastUsedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("last_used_at"),
    expiresAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("expires_at"),
    isRevoked: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_revoked").default(false),
    revokedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("revoked_at"),
    scopes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("scopes").array().default([]),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertApiKeySchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(apiKeys).omit({
    id: true,
    createdAt: true,
    lastUsedAt: true,
    isRevoked: true,
    revokedAt: true
});
const demoLeads = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("demo_leads", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("email").notNull(),
    company: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("company"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone"),
    message: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("message"),
    source: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("source").default("chatgpt"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertDemoLeadSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(demoLeads).omit({
    id: true,
    createdAt: true
});
const finWorkspaces = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_workspaces", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull().default("company"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    fiscalYearStart: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("fiscal_year_start").default(4),
    vatRegistered: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("vat_registered").default(false),
    vatNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("vat_number"),
    companyName: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("company_name"),
    companyAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("company_address"),
    companyEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("company_email"),
    companyPhone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("company_phone"),
    invoicePrefix: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("invoice_prefix").default("INV"),
    nextInvoiceNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("next_invoice_number").default(1001),
    billPrefix: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("bill_prefix").default("BILL"),
    nextBillNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("next_bill_number").default(1001),
    creditNotePrefix: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("credit_note_prefix").default("CN"),
    nextCreditNoteNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("next_credit_note_number").default(1001),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finAccounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_accounts", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("code").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull(),
    subtype: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("subtype"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    isSystem: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_system").default(false),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finCustomers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_customers", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone"),
    address: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("address"),
    taxId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("tax_id"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    defaultPaymentTerms: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("default_payment_terms").default(30),
    totalInvoiced: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_invoiced", {
        precision: 12,
        scale: 2
    }).default("0"),
    totalPaid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_paid", {
        precision: 12,
        scale: 2
    }).default("0"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finSuppliers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_suppliers", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    email: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("email"),
    phone: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("phone"),
    address: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("address"),
    taxId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("tax_id"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    defaultPaymentTerms: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("default_payment_terms").default(30),
    totalBilled: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_billed", {
        precision: 12,
        scale: 2
    }).default("0"),
    totalPaid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total_paid", {
        precision: 12,
        scale: 2
    }).default("0"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finInvoices = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_invoices", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    customerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("customer_id").notNull().references(()=>finCustomers.id),
    invoiceNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("invoice_number").notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    issueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("issue_date").defaultNow(),
    dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("due_date"),
    subtotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("subtotal", {
        precision: 12,
        scale: 2
    }).default("0"),
    taxAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total", {
        precision: 12,
        scale: 2
    }).default("0"),
    amountPaid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount_paid", {
        precision: 12,
        scale: 2
    }).default("0"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    terms: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("terms"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    journalEntryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("journal_entry_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("invoice_ws_number").on(table.workspaceId, table.invoiceNumber)
    ]);
const finInvoiceLines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_invoice_lines", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("invoice_id").notNull().references(()=>finInvoices.id),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    quantity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("quantity", {
        precision: 10,
        scale: 4
    }).default("1"),
    unitPrice: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("unit_price", {
        precision: 12,
        scale: 2
    }).default("0"),
    taxRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_rate", {
        precision: 5,
        scale: 2
    }).default("0"),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    accountId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("account_id"),
    sortOrder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("sort_order").default(0)
});
const finCreditNotes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_credit_notes", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("invoice_id").references(()=>finInvoices.id),
    customerId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("customer_id").notNull().references(()=>finCustomers.id),
    creditNoteNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("credit_note_number").notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    issueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("issue_date").defaultNow(),
    reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reason"),
    subtotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("subtotal", {
        precision: 12,
        scale: 2
    }).default("0"),
    taxTotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_total", {
        precision: 12,
        scale: 2
    }).default("0"),
    total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total", {
        precision: 12,
        scale: 2
    }).default("0"),
    amountApplied: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount_applied", {
        precision: 12,
        scale: 2
    }).default("0"),
    journalEntryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("journal_entry_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("credit_note_ws_number").on(table.workspaceId, table.creditNoteNumber)
    ]);
const finCreditNoteLines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_credit_note_lines", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    creditNoteId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("credit_note_id").notNull().references(()=>finCreditNotes.id),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    quantity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("quantity", {
        precision: 10,
        scale: 4
    }).default("1"),
    unitPrice: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("unit_price", {
        precision: 12,
        scale: 2
    }).notNull(),
    taxRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_rate", {
        precision: 5,
        scale: 2
    }).default("0"),
    lineTotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("line_total", {
        precision: 12,
        scale: 2
    }).notNull(),
    accountId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("account_id").references(()=>finAccounts.id)
});
const finBills = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_bills", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    supplierId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("supplier_id").notNull().references(()=>finSuppliers.id),
    billNumber: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("bill_number").notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("draft"),
    category: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("category"),
    issueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("issue_date").defaultNow(),
    dueDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("due_date"),
    subtotal: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("subtotal", {
        precision: 12,
        scale: 2
    }).default("0"),
    taxAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    total: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("total", {
        precision: 12,
        scale: 2
    }).default("0"),
    amountPaid: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount_paid", {
        precision: 12,
        scale: 2
    }).default("0"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    receiptUrl: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("receipt_url"),
    currency: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("currency").default("GBP"),
    journalEntryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("journal_entry_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow(),
    updatedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("updated_at").defaultNow()
}, (table)=>[
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$indexes$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["uniqueIndex"])("bill_ws_number").on(table.workspaceId, table.billNumber)
    ]);
const finBillLines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_bill_lines", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    billId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("bill_id").notNull().references(()=>finBills.id),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description").notNull(),
    quantity: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("quantity", {
        precision: 10,
        scale: 4
    }).default("1"),
    unitPrice: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("unit_price", {
        precision: 12,
        scale: 2
    }).default("0"),
    taxRate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("tax_rate", {
        precision: 5,
        scale: 2
    }).default("0"),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount", {
        precision: 12,
        scale: 2
    }).default("0"),
    accountId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("account_id"),
    sortOrder: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("sort_order").default(0)
});
const finPayments = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_payments", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    type: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("type").notNull(),
    invoiceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("invoice_id"),
    billId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("bill_id"),
    amount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("amount", {
        precision: 12,
        scale: 2
    }).notNull(),
    paymentDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("payment_date").defaultNow(),
    method: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("method").default("bank_transfer"),
    reference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reference"),
    notes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("notes"),
    accountId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("account_id"),
    journalEntryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("journal_entry_id"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finJournalEntries = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_journal_entries", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    entryDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("entry_date").defaultNow(),
    reference: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reference"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description"),
    sourceType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("source_type"),
    sourceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("source_id"),
    isManual: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_manual").default(false),
    isPosted: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_posted").default(false),
    createdBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("created_by"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const finJournalLines = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_journal_lines", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    journalEntryId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("journal_entry_id").notNull().references(()=>finJournalEntries.id),
    accountId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("account_id").notNull().references(()=>finAccounts.id),
    debit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("debit", {
        precision: 12,
        scale: 2
    }).default("0"),
    credit: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("credit", {
        precision: 12,
        scale: 2
    }).default("0"),
    description: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("description")
});
const finTaxCodes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_tax_codes", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    code: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("code").notNull(),
    name: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("name").notNull(),
    rate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$numeric$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["numeric"])("rate", {
        precision: 5,
        scale: 2
    }).notNull(),
    isDefault: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_default").default(false),
    isActive: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$boolean$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["boolean"])("is_active").default(true)
});
const finAuditLog = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("fin_audit_log", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    workspaceId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("workspace_id").notNull().references(()=>finWorkspaces.id),
    userId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("user_id"),
    action: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("action").notNull(),
    entityType: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("entity_type").notNull(),
    entityId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("entity_id"),
    changes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("changes"),
    ipAddress: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("ip_address"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertFinWorkspaceSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finWorkspaces).omit({
    id: true,
    createdAt: true
});
const insertFinAccountSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finAccounts).omit({
    id: true,
    createdAt: true
});
const insertFinCustomerSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finCustomers).omit({
    id: true,
    createdAt: true
});
const insertFinSupplierSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finSuppliers).omit({
    id: true,
    createdAt: true
});
const insertFinInvoiceSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finInvoices).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertFinInvoiceLineSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finInvoiceLines).omit({
    id: true
});
const insertCreditNoteSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finCreditNotes).omit({
    id: true,
    createdAt: true
});
const insertCreditNoteLineSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finCreditNoteLines).omit({
    id: true
});
const insertFinBillSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finBills).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
const insertFinBillLineSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finBillLines).omit({
    id: true
});
const insertFinPaymentSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finPayments).omit({
    id: true,
    createdAt: true
});
const insertFinJournalEntrySchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finJournalEntries).omit({
    id: true,
    createdAt: true
});
const insertFinJournalLineSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finJournalLines).omit({
    id: true
});
const insertFinTaxCodeSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finTaxCodes).omit({
    id: true
});
const insertFinAuditLogSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(finAuditLog).omit({
    id: true,
    createdAt: true
});
const deploymentModelChanges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$table$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["pgTable"])("deployment_model_changes", {
    id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$serial$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["serial"])("id").primaryKey(),
    orgId: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("org_id").notNull().references(()=>orgs.id),
    oldModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("old_model").notNull(),
    newModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("new_model").notNull(),
    status: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("status").notNull().default("pending"),
    reason: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("reason"),
    prerequisitesMet: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$jsonb$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["jsonb"])("prerequisites_met"),
    activeCallsAtSwitch: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("active_calls_at_switch").default(0),
    initiatedBy: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$integer$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["integer"])("initiated_by").notNull().references(()=>users.id),
    initiatedByEmail: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$text$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["text"])("initiated_by_email"),
    effectiveAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("effective_at"),
    completedAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("completed_at"),
    createdAt: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$pg$2d$core$2f$columns$2f$timestamp$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["timestamp"])("created_at").defaultNow()
});
const insertDeploymentModelChangeSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$zod$2f$index$2e$mjs__$5b$instrumentation$5d$__$28$ecmascript$29$__["createInsertSchema"])(deploymentModelChanges).omit({
    id: true,
    createdAt: true
});
;
}),
"[project]/lib/money.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "calculatePercentage",
    ()=>calculatePercentage,
    "formatCurrency",
    ()=>formatCurrency,
    "roundMoney",
    ()=>roundMoney,
    "roundRate",
    ()=>roundRate,
    "safeAdd",
    ()=>safeAdd,
    "safeParseNumeric",
    ()=>safeParseNumeric,
    "safeSubtract",
    ()=>safeSubtract,
    "validateAmount",
    ()=>validateAmount
]);
function safeParseNumeric(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return isNaN(parsed) || !isFinite(parsed) ? fallback : parsed;
}
function roundMoney(value) {
    if (isNaN(value) || !isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
}
function roundRate(value, decimals = 4) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}
function validateAmount(amount, label = "Amount") {
    if (typeof amount !== "number" || isNaN(amount)) {
        return `${label} must be a valid number`;
    }
    if (amount <= 0) {
        return `${label} must be greater than zero`;
    }
    if (amount > 999999.99) {
        return `${label} exceeds maximum allowed (£999,999.99)`;
    }
    const rounded = roundMoney(amount);
    if (Math.abs(amount - rounded) > 0.001) {
        return `${label} cannot have more than 2 decimal places`;
    }
    return null;
}
function safeSubtract(a, b) {
    return roundMoney(a - b);
}
function safeAdd(a, b) {
    return roundMoney(a + b);
}
function calculatePercentage(amount, percent) {
    return roundMoney(amount * percent / 100);
}
function formatCurrency(amount, currency = "GBP") {
    const symbol = currency === "GBP" ? "£" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency;
    return `${symbol}${roundMoney(amount).toFixed(2)}`;
}
}),
"[project]/lib/notifications.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "createBulkNotifications",
    ()=>createBulkNotifications,
    "createNotification",
    ()=>createNotification
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/shared/schema.ts [instrumentation] (ecmascript) <locals>");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
async function createNotification(params) {
    try {
        const [notification] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["notifications"]).values({
            userId: params.userId,
            orgId: params.orgId ?? null,
            type: params.type,
            title: params.title,
            message: params.message,
            actionUrl: params.actionUrl ?? null,
            metadata: params.metadata ?? null
        }).returning();
        return notification;
    } catch (error) {
        console.error("[Notifications] Failed to create notification:", error);
        return null;
    }
}
async function createBulkNotifications(userIds, params) {
    try {
        const values = userIds.map((userId)=>({
                userId,
                orgId: params.orgId ?? null,
                type: params.type,
                title: params.title,
                message: params.message,
                actionUrl: params.actionUrl ?? null,
                metadata: params.metadata ?? null
            }));
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["notifications"]).values(values);
    } catch (error) {
        console.error("[Notifications] Failed to create bulk notifications:", error);
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/wallet.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "deductFromWallet",
    ()=>deductFromWallet,
    "deductWithIdempotency",
    ()=>deductWithIdempotency,
    "getOrCreateWallet",
    ()=>getOrCreateWallet,
    "getWalletBalance",
    ()=>getWalletBalance,
    "hasInsufficientBalance",
    ()=>hasInsufficientBalance,
    "isLowBalance",
    ()=>isLowBalance,
    "refundToWallet",
    ()=>refundToWallet,
    "topUpWallet",
    ()=>topUpWallet
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/shared/schema.ts [instrumentation] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/money.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/notifications.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
async function getOrCreateWallet(orgId) {
    try {
        const [existing] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"].orgId, orgId)).limit(1);
        if (existing) return existing;
        const [wallet] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"]).values({
            orgId,
            balance: "0"
        }).onConflictDoNothing().returning();
        if (wallet) return wallet;
        const [fallback] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"].orgId, orgId)).limit(1);
        if (fallback) return fallback;
        throw new Error("Failed to create or find wallet");
    } catch (err) {
        if (err instanceof Error && err.message === "Failed to create or find wallet") throw err;
        const [existing] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["wallets"].orgId, orgId)).limit(1);
        if (existing) return existing;
        throw err;
    }
}
async function getWalletBalance(orgId) {
    const wallet = await getOrCreateWallet(orgId);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(wallet.balance, 0));
}
async function hasInsufficientBalance(orgId, requiredAmount = 0.01) {
    const balance = await getWalletBalance(orgId);
    return balance < (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(requiredAmount);
}
async function checkSpendingCap(orgId, amount) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [usage] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
        spendingCap: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].spendingCap
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].month, month))).limit(1);
    const cap = usage?.spendingCap;
    const parsedCap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(cap, 0);
    if (parsedCap <= 0) {
        return {
            exceeded: false,
            cap: null,
            currentSpend: 0
        };
    }
    const [spendResult] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
        total: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`COALESCE(SUM(ABS(amount)), 0)`
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].type, "deduction"), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].createdAt} >= date_trunc('month', CURRENT_DATE)`));
    const currentSpend = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(spendResult?.total, 0));
    const projectedSpend = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeAdd"])(currentSpend, amount);
    const roundedCap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(parsedCap);
    return {
        exceeded: projectedSpend > roundedCap,
        cap: roundedCap,
        currentSpend
    };
}
async function deductFromWallet(orgId, amount, description, referenceType, referenceId) {
    const roundedAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(amount);
    if (roundedAmount <= 0) return null;
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].transaction(async (tx)=>{
        const walletResult = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`);
        const wallet = walletResult.rows[0];
        if (!wallet) throw new Error("Wallet not found");
        const currentBalance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(wallet.balance, 0));
        if (currentBalance < roundedAmount) throw new Error("Insufficient balance");
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const [usage] = await tx.select({
            spendingCap: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].spendingCap
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["usageRecords"].month, month))).limit(1);
        const cap = usage?.spendingCap;
        const parsedCapInTx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(cap, 0);
        if (parsedCapInTx > 0) {
            const [spendResult] = await tx.select({
                total: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`COALESCE(SUM(ABS(amount)), 0)`
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].type, "deduction"), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].createdAt} >= date_trunc('month', CURRENT_DATE)`));
            const currentSpend = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(spendResult?.total, 0));
            const projectedSpend = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeAdd"])(currentSpend, roundedAmount);
            const roundedCap = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(parsedCapInTx);
            if (projectedSpend > roundedCap) {
                throw new Error(`Spending cap exceeded. Monthly cap: £${roundedCap.toFixed(2)}, current spend: £${currentSpend.toFixed(2)}, attempted: £${roundedAmount.toFixed(2)}`);
            }
        }
        const balanceBefore = currentBalance;
        const updateRaw = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`UPDATE wallets SET balance = ROUND((balance - ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} AND balance >= ${roundedAmount} RETURNING balance`);
        const updateResult = updateRaw.rows;
        if (!updateResult || updateResult.length === 0) {
            throw new Error("Insufficient balance (concurrent deduction)");
        }
        const actualBalanceAfter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(updateResult[0].balance, 0));
        const [txn] = await tx.insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).values({
            orgId,
            type: "deduction",
            amount: String(-roundedAmount),
            balanceBefore: String(balanceBefore),
            balanceAfter: String(actualBalanceAfter),
            description,
            referenceType,
            referenceId
        }).returning();
        checkAndNotifyBalance(orgId, actualBalanceAfter).catch(()=>{});
        return {
            transaction: txn,
            newBalance: actualBalanceAfter
        };
    });
    const REVENUE_REFERENCE_TYPES = [
        "call",
        "ai_chat",
        "transcription",
        "knowledge"
    ];
    if (result) {
        if (REVENUE_REFERENCE_TYPES.includes(referenceType)) {
            try {
                const { processDistribution } = await __turbopack_context__.A("[project]/lib/distribution.ts [instrumentation] (ecmascript, async loader)");
                await processDistribution(orgId, roundedAmount, result.transaction.id, description);
            } catch (distErr) {
                console.error("Distribution processing error:", distErr);
                try {
                    const { logFailedDistribution } = await __turbopack_context__.A("[project]/lib/distribution.ts [instrumentation] (ecmascript, async loader)");
                    await logFailedDistribution(orgId, roundedAmount, result.transaction.id, description, distErr instanceof Error ? distErr.message : "Unknown error");
                } catch (logErr) {
                    console.error("Failed to log distribution error:", logErr);
                }
            }
        }
        try {
            const { logAudit } = await __turbopack_context__.A("[project]/lib/audit.ts [instrumentation] (ecmascript, async loader)");
            await logAudit({
                actorId: null,
                actorEmail: null,
                action: "wallet.deduction",
                entityType: "wallet",
                entityId: orgId,
                details: {
                    amount: roundedAmount,
                    description,
                    referenceType,
                    newBalance: result.newBalance
                }
            });
        } catch (auditErr) {
            console.error("Audit log error (deduction):", auditErr);
        }
    }
    return result;
}
async function checkAndNotifyBalance(orgId, newBalance) {
    try {
        const wallet = await getOrCreateWallet(orgId);
        const threshold = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(wallet.lowBalanceThreshold, 10));
        const roundedBalance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(newBalance);
        if (roundedBalance <= threshold && roundedBalance > 0) {
            const members = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
                userId: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"].userId
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"].orgId, orgId));
            for (const member of members){
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["createNotification"])({
                    userId: member.userId,
                    orgId,
                    type: "low_balance",
                    title: "Low wallet balance",
                    message: `Your balance is £${roundedBalance.toFixed(2)}, below the £${threshold.toFixed(2)} threshold. Top up to avoid service interruption.`,
                    actionUrl: "/dashboard/wallet"
                });
            }
        }
        if (roundedBalance <= 0) {
            const members = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
                userId: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"].userId
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgMembers"].orgId, orgId));
            for (const member of members){
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$notifications$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["createNotification"])({
                    userId: member.userId,
                    orgId,
                    type: "spending_cap",
                    title: "Wallet balance depleted",
                    message: "Your wallet balance has reached zero. Calls will be blocked until you top up.",
                    actionUrl: "/dashboard/wallet"
                });
            }
        }
    } catch (err) {
        console.error("[Notifications] Balance check notification error:", err);
    }
}
async function topUpWallet(orgId, amount, description = "Wallet top-up", referenceType = "manual", referenceId) {
    const roundedAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(amount);
    const validationError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateAmount"])(roundedAmount, "Top-up amount");
    if (validationError) throw new Error(validationError);
    await getOrCreateWallet(orgId);
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].transaction(async (tx)=>{
        const topUpResult = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`);
        const topUpWalletRow = topUpResult.rows[0];
        if (!topUpWalletRow) throw new Error("Wallet not found");
        const balanceBefore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(topUpWalletRow.balance, 0));
        const topUpUpdateRaw = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`UPDATE wallets SET balance = ROUND((balance + ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} RETURNING balance`);
        const topUpUpdateResult = topUpUpdateRaw.rows;
        const actualBalanceAfter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(topUpUpdateResult[0]?.balance, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeAdd"])(balanceBefore, roundedAmount)));
        const [txn] = await tx.insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).values({
            orgId,
            type: "top_up",
            amount: String(roundedAmount),
            balanceBefore: String(balanceBefore),
            balanceAfter: String(actualBalanceAfter),
            description,
            referenceType,
            referenceId
        }).returning();
        return {
            transaction: txn,
            newBalance: actualBalanceAfter
        };
    });
    try {
        const { logAudit } = await __turbopack_context__.A("[project]/lib/audit.ts [instrumentation] (ecmascript, async loader)");
        await logAudit({
            actorId: null,
            actorEmail: null,
            action: "wallet.topup",
            entityType: "wallet",
            entityId: orgId,
            details: {
                amount: roundedAmount,
                description,
                referenceType,
                newBalance: result.newBalance
            }
        });
    } catch (auditErr) {
        console.error("Audit log error (topup):", auditErr);
    }
    return result;
}
async function refundToWallet(orgId, amount, description, referenceType = "manual", referenceId, originalTransactionId) {
    const roundedAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(amount);
    const validationError = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["validateAmount"])(roundedAmount, "Refund amount");
    if (validationError) throw new Error(validationError);
    if (originalTransactionId) {
        const [existingRefund] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
            id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].id
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].type, "refund"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].referenceId, `refund-txn-${originalTransactionId}`))).limit(1);
        if (existingRefund) {
            throw new Error("Refund already processed for this transaction");
        }
    }
    await getOrCreateWallet(orgId);
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].transaction(async (tx)=>{
        const refundResult = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`);
        const refundWalletRow = refundResult.rows[0];
        if (!refundWalletRow) throw new Error("Wallet not found");
        const balanceBefore = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(refundWalletRow.balance, 0));
        const refundUpdateRaw = await tx.execute(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`UPDATE wallets SET balance = ROUND((balance + ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} RETURNING balance`);
        const refundUpdateResult = refundUpdateRaw.rows;
        const actualBalanceAfter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(refundUpdateResult[0]?.balance, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeAdd"])(balanceBefore, roundedAmount)));
        const refId = originalTransactionId ? `refund-txn-${originalTransactionId}` : referenceId || `refund-${Date.now()}`;
        const [txn] = await tx.insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).values({
            orgId,
            type: "refund",
            amount: String(roundedAmount),
            balanceBefore: String(balanceBefore),
            balanceAfter: String(actualBalanceAfter),
            description,
            referenceType,
            referenceId: refId
        }).returning();
        return {
            transaction: txn,
            newBalance: actualBalanceAfter
        };
    });
    try {
        const { logAudit } = await __turbopack_context__.A("[project]/lib/audit.ts [instrumentation] (ecmascript, async loader)");
        await logAudit({
            actorId: null,
            actorEmail: null,
            action: "wallet.refund",
            entityType: "wallet",
            entityId: orgId,
            details: {
                amount: roundedAmount,
                description,
                referenceType,
                originalTransactionId,
                newBalance: result.newBalance
            }
        });
    } catch (auditErr) {
        console.error("Audit log error (refund):", auditErr);
    }
    return result;
}
async function deductWithIdempotency(orgId, amount, idempotencyKey, description, referenceType, referenceId) {
    const [existing] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].id
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].orgId, orgId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].referenceId, `idem-${idempotencyKey}`))).limit(1);
    if (existing) {
        return null;
    }
    return deductFromWallet(orgId, amount, description, referenceType, referenceId || `idem-${idempotencyKey}`);
}
async function isLowBalance(orgId) {
    const wallet = await getOrCreateWallet(orgId);
    const threshold = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(wallet.lowBalanceThreshold, 10));
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(wallet.balance, 0)) <= threshold;
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/distribution.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "calculateWaterfall",
    ()=>calculateWaterfall,
    "getDistributionHierarchy",
    ()=>getDistributionHierarchy,
    "logFailedDistribution",
    ()=>logFailedDistribution,
    "processAffiliateCommission",
    ()=>processAffiliateCommission,
    "processDistribution",
    ()=>processDistribution,
    "processMultiTierDistribution",
    ()=>processMultiTierDistribution,
    "processPartnerRevenueShare",
    ()=>processPartnerRevenueShare,
    "recordDistribution",
    ()=>recordDistribution,
    "retryFailedDistributions",
    ()=>retryFailedDistributions
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/shared/schema.ts [instrumentation] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wallet$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/wallet.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/money.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wallet$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wallet$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
;
async function logFailedDistribution(orgId, deductionAmount, walletTransactionId, description, errorMessage) {
    try {
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"]).values({
            orgId,
            deductionAmount: String((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(deductionAmount)),
            walletTransactionId: walletTransactionId ?? null,
            description: description ?? null,
            errorMessage,
            retryCount: 0,
            maxRetries: 3,
            status: "pending"
        });
    } catch (logErr) {
        console.error("CRITICAL: Failed to log distribution failure:", logErr);
    }
}
async function processAffiliateCommission(orgId, deductionAmount, walletTransactionId, description) {
    if (deductionAmount <= 0) return null;
    try {
        const [org] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgs"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgs"].id, orgId)).limit(1);
        if (!org || !org.referredByAffiliateId) return null;
        const [affiliate] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"].id, org.referredByAffiliateId)).limit(1);
        if (!affiliate || affiliate.status !== "active") return null;
        let commissionAmount = 0;
        if (affiliate.commissionType === "percentage") {
            commissionAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(deductionAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(affiliate.commissionRate, 10));
        } else {
            commissionAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(affiliate.commissionRate, 0));
        }
        if (commissionAmount <= 0) return null;
        const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliateCommissions"]).values({
            affiliateId: affiliate.id,
            orgId,
            walletTransactionId: walletTransactionId ?? null,
            sourceAmount: String((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(deductionAmount)),
            commissionRate: affiliate.commissionRate ?? "10",
            commissionAmount: String(commissionAmount),
            status: "pending",
            description: description ?? `Commission on £${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(deductionAmount).toFixed(2)} spend`
        }).onConflictDoNothing().returning();
        const commission = result[0];
        if (!commission) return null;
        await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].update(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"]).set({
            totalEarnings: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`ROUND((${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"].totalEarnings} + ${commissionAmount})::numeric, 2)`,
            pendingPayout: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`ROUND((${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"].pendingPayout} + ${commissionAmount})::numeric, 2)`,
            updatedAt: new Date()
        }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"].id, affiliate.id));
        return commission;
    } catch (error) {
        console.error("Affiliate commission processing error:", error);
        throw error;
    }
}
async function processPartnerRevenueShare(orgId, deductionAmount, description, walletTransactionId) {
    if (deductionAmount <= 0) return null;
    try {
        const [clientLink] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partnerClients"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partnerClients"].orgId, orgId)).limit(1);
        if (!clientLink || clientLink.status !== "active") return null;
        const [partner] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"].id, clientLink.partnerId)).limit(1);
        if (!partner || partner.status !== "active" || !partner.orgId) return null;
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(partner.revenueSharePercent, 0) <= 0) return null;
        const shareAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(deductionAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(partner.revenueSharePercent, 0));
        if (shareAmount <= 0) return null;
        const refId = walletTransactionId ? `partner_${partner.id}_txn_${walletTransactionId}` : `partner_${partner.id}_org_${orgId}_${Date.now()}`;
        if (walletTransactionId) {
            const [existingTxn] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
                id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].id
            }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].referenceId, refId), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["walletTransactions"].referenceType, "partner_revenue_share"))).limit(1);
            if (existingTxn) return null;
        }
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wallet$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["topUpWallet"])(partner.orgId, shareAmount, description ?? `Revenue share: ${partner.revenueSharePercent}% of £${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(deductionAmount).toFixed(2)} from org #${orgId}`, "partner_revenue_share", refId);
        return {
            partnerId: partner.id,
            shareAmount
        };
    } catch (error) {
        console.error("Partner revenue share error:", error);
        throw error;
    }
}
async function processDistribution(orgId, deductionAmount, walletTransactionId, description) {
    const results = {
        affiliateCommission: null,
        partnerRevenueShare: null
    };
    try {
        results.affiliateCommission = await processAffiliateCommission(orgId, deductionAmount, walletTransactionId, description);
    } catch (affErr) {
        console.error("Affiliate commission failed, logging for retry:", affErr);
        await logFailedDistribution(orgId, deductionAmount, walletTransactionId, `affiliate_commission: ${description ?? ""}`, affErr instanceof Error ? affErr.message : "Unknown error");
    }
    try {
        results.partnerRevenueShare = await processPartnerRevenueShare(orgId, deductionAmount, description, walletTransactionId);
    } catch (partErr) {
        console.error("Partner revenue share failed, logging for retry:", partErr);
        await logFailedDistribution(orgId, deductionAmount, walletTransactionId, `partner_revenue_share: ${description ?? ""}`, partErr instanceof Error ? partErr.message : "Unknown error");
    }
    return results;
}
async function retryDistributionEntry(entry) {
    const isAffiliate = entry.description?.startsWith("affiliate_commission:");
    const isPartner = entry.description?.startsWith("partner_revenue_share:");
    const deductionAmt = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(entry.deductionAmount, 0);
    if (deductionAmt <= 0) return;
    if (isAffiliate) {
        await processAffiliateCommission(entry.orgId, deductionAmt, entry.walletTransactionId ?? undefined, entry.description?.replace("affiliate_commission: ", "") ?? undefined);
    } else if (isPartner) {
        await processPartnerRevenueShare(entry.orgId, deductionAmt, entry.description?.replace("partner_revenue_share: ", "") ?? undefined);
    } else {
        await processAffiliateCommission(entry.orgId, deductionAmt, entry.walletTransactionId ?? undefined, entry.description ?? undefined);
        await processPartnerRevenueShare(entry.orgId, deductionAmt, entry.description ?? undefined);
    }
}
async function retryFailedDistributions() {
    const pending = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"].status, "pending"), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"].retryCount} < ${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"].maxRetries}`)).limit(10);
    let resolved = 0;
    for (const entry of pending){
        try {
            await retryDistributionEntry(entry);
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].update(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"]).set({
                status: "resolved",
                resolvedAt: new Date()
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"].id, entry.id));
            resolved++;
        } catch (err) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].update(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"]).set({
                retryCount: (entry.retryCount ?? 0) + 1,
                status: (entry.retryCount ?? 0) + 1 >= (entry.maxRetries ?? 3) ? "failed" : "pending",
                errorMessage: err instanceof Error ? err.message : "Unknown error"
            }).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["failedDistributions"].id, entry.id));
        }
    }
    return {
        total: pending.length,
        resolved
    };
}
async function getDistributionHierarchy(orgId) {
    const [org] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgs"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["orgs"].id, orgId)).limit(1);
    if (!org) return null;
    const hierarchy = {
        org,
        channelType: org.channelType ?? "d2c",
        partner: null,
        parentPartner: null,
        reseller: null,
        affiliate: null
    };
    const [clientLink] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partnerClients"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partnerClients"].orgId, orgId)).limit(1);
    if (clientLink) {
        const [directPartner] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"].id, clientLink.partnerId)).limit(1);
        if (directPartner) {
            if (directPartner.partnerType === "reseller" && directPartner.parentPartnerId) {
                hierarchy.reseller = directPartner;
                hierarchy.channelType = "reseller";
                const [parent] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["partners"].id, directPartner.parentPartnerId)).limit(1);
                if (parent) {
                    hierarchy.parentPartner = parent;
                    hierarchy.partner = parent;
                }
            } else {
                hierarchy.partner = directPartner;
                hierarchy.channelType = "partner";
            }
        }
    }
    if (org.referredByAffiliateId) {
        const [affiliate] = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select().from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["affiliates"].id, org.referredByAffiliateId)).limit(1);
        if (affiliate) {
            hierarchy.affiliate = affiliate;
        }
    }
    return hierarchy;
}
function calculateWaterfall(totalAmount, hierarchy) {
    if (!hierarchy) {
        return {
            totalAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(totalAmount),
            platformAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(totalAmount),
            partnerAmount: 0,
            partnerId: null,
            resellerAmount: 0,
            resellerId: null,
            affiliateAmount: 0,
            affiliateId: null,
            channel: "d2c"
        };
    }
    let remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(totalAmount);
    let affiliateAmount = 0;
    let partnerAmount = 0;
    let resellerAmount = 0;
    let partnerId = null;
    let resellerId = null;
    let affiliateId = null;
    if (hierarchy.affiliate && hierarchy.affiliate.status === "active") {
        const aff = hierarchy.affiliate;
        affiliateId = aff.id;
        if (aff.commissionType === "percentage") {
            affiliateAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(totalAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(aff.commissionRate, 10));
        } else {
            affiliateAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(aff.commissionRate, 0));
        }
        affiliateAmount = Math.min(affiliateAmount, remaining);
        remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeSubtract"])(remaining, affiliateAmount);
    }
    if (hierarchy.reseller && hierarchy.parentPartner) {
        const resellerPartner = hierarchy.reseller;
        const parentPartner = hierarchy.parentPartner;
        resellerId = resellerPartner.id;
        partnerId = parentPartner.id;
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(resellerPartner.revenueSharePercent, 0) > 0) {
            resellerAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(totalAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(resellerPartner.revenueSharePercent, 0));
            resellerAmount = Math.min(resellerAmount, remaining);
            remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeSubtract"])(remaining, resellerAmount);
        }
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(parentPartner.revenueSharePercent, 0) > 0) {
            partnerAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(totalAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(parentPartner.revenueSharePercent, 0));
            partnerAmount = Math.min(partnerAmount, remaining);
            remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeSubtract"])(remaining, partnerAmount);
        }
    } else if (hierarchy.partner) {
        const partner = hierarchy.partner;
        partnerId = partner.id;
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(partner.revenueSharePercent, 0) > 0) {
            partnerAmount = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["calculatePercentage"])(totalAmount, (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeParseNumeric"])(partner.revenueSharePercent, 0));
            partnerAmount = Math.min(partnerAmount, remaining);
            remaining = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["safeSubtract"])(remaining, partnerAmount);
        }
    }
    return {
        totalAmount: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(totalAmount),
        platformAmount: Math.max(0, remaining),
        partnerAmount,
        partnerId,
        resellerAmount,
        resellerId,
        affiliateAmount,
        affiliateId,
        channel: hierarchy.channelType
    };
}
async function recordDistribution(orgId, waterfall, billingLedgerId, walletTransactionId) {
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["distributionLedger"]).values({
        orgId,
        billingLedgerId: billingLedgerId ?? null,
        walletTransactionId: walletTransactionId ?? null,
        totalAmount: String(waterfall.totalAmount),
        platformAmount: String(waterfall.platformAmount),
        partnerAmount: String(waterfall.partnerAmount),
        partnerId: waterfall.partnerId,
        resellerAmount: String(waterfall.resellerAmount),
        resellerId: waterfall.resellerId,
        affiliateAmount: String(waterfall.affiliateAmount),
        affiliateId: waterfall.affiliateId,
        channel: waterfall.channel,
        status: "completed"
    }).onConflictDoNothing().returning();
    return result[0] ?? null;
}
async function processMultiTierDistribution(orgId, deductionAmount, walletTransactionId, billingLedgerId, description) {
    if (deductionAmount <= 0) return null;
    try {
        const hierarchy = await getDistributionHierarchy(orgId);
        const waterfall = calculateWaterfall(deductionAmount, hierarchy);
        if (waterfall.affiliateAmount > 0 && waterfall.affiliateId) {
            await processAffiliateCommission(orgId, deductionAmount, walletTransactionId, description);
        }
        if (waterfall.resellerAmount > 0 && waterfall.resellerId) {
            const resellerPartner = hierarchy?.reseller;
            if (resellerPartner?.orgId) {
                const refId = walletTransactionId ? `reseller_${waterfall.resellerId}_txn_${walletTransactionId}` : `reseller_${waterfall.resellerId}_org_${orgId}_${Date.now()}`;
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$wallet$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["topUpWallet"])(resellerPartner.orgId, waterfall.resellerAmount, description ?? `Reseller share: ${resellerPartner.revenueSharePercent}% of ${(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$money$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["roundMoney"])(deductionAmount).toFixed(2)} from org #${orgId}`, "reseller_revenue_share", refId);
            }
        }
        if (waterfall.partnerAmount > 0 && waterfall.partnerId) {
            await processPartnerRevenueShare(orgId, deductionAmount, description, walletTransactionId);
        }
        const ledgerEntry = await recordDistribution(orgId, waterfall, billingLedgerId, walletTransactionId);
        return {
            waterfall,
            ledgerEntry
        };
    } catch (error) {
        console.error("Multi-tier distribution error:", error);
        await logFailedDistribution(orgId, deductionAmount, walletTransactionId, `multi_tier: ${description ?? ""}`, error instanceof Error ? error.message : "Unknown error");
        return null;
    }
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
"[project]/lib/cleanup.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

return __turbopack_context__.a(async (__turbopack_handle_async_dependencies__, __turbopack_async_result__) => { try {

__turbopack_context__.s([
    "cleanupExpiredCache",
    ()=>cleanupExpiredCache,
    "cleanupExpiredSessions",
    ()=>cleanupExpiredSessions,
    "retryFailedDocuments",
    ()=>retryFailedDocuments,
    "runAllCleanupJobs",
    ()=>runAllCleanupJobs,
    "startPeriodicCleanup",
    ()=>startPeriodicCleanup
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/db.ts [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/shared/schema.ts [instrumentation] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/expressions/conditions.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/drizzle-orm/sql/sql.js [instrumentation] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$distribution$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/distribution.ts [instrumentation] (ecmascript)");
var __turbopack_async_dependencies__ = __turbopack_handle_async_dependencies__([
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__,
    __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$distribution$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__
]);
[__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$distribution$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__] = __turbopack_async_dependencies__.then ? (await __turbopack_async_dependencies__)() : __turbopack_async_dependencies__;
;
;
;
;
async function cleanupExpiredSessions() {
    const now = new Date();
    const idleCutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const absoluteCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"]).where(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].expiresAt} < ${now}
      OR (${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].lastSeenAt} IS NOT NULL AND ${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].lastSeenAt} < ${idleCutoff})
      OR (${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].createdAt} IS NOT NULL AND ${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].createdAt} < ${absoluteCutoff})`).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["sessions"].id
    });
    return result.length;
}
async function cleanupExpiredCache() {
    const result = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].delete(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["responseCache"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["lt"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["responseCache"].expiresAt, new Date()), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["responseCache"].expiresAt} IS NOT NULL`)).returning({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["responseCache"].id
    });
    return result.length;
}
async function retryFailedDocuments() {
    const failedDocs = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
        id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["knowledgeDocuments"].id,
        orgId: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["knowledgeDocuments"].orgId
    }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["knowledgeDocuments"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["knowledgeDocuments"].status, "error")).limit(5);
    let retried = 0;
    for (const doc of failedDocs){
        const existingJob = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].select({
            id: __TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"].id
        }).from(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"]).where((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["and"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"].type, "DOCUMENT_PROCESS"), (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$expressions$2f$conditions$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["eq"])(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"].status, "pending"), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$drizzle$2d$orm$2f$sql$2f$sql$2e$js__$5b$instrumentation$5d$__$28$ecmascript$29$__["sql"]`${__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"].payload}->>'documentId' = ${String(doc.id)}`)).limit(1);
        if (existingJob.length === 0) {
            await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["db"].insert(__TURBOPACK__imported__module__$5b$project$5d2f$shared$2f$schema$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__$3c$locals$3e$__["jobs"]).values({
                type: "DOCUMENT_PROCESS",
                payload: {
                    documentId: doc.id,
                    orgId: doc.orgId
                },
                status: "pending",
                maxAttempts: 3
            });
            retried++;
        }
    }
    return retried;
}
async function runAllCleanupJobs() {
    const [sessions, cache, documents, distributions] = await Promise.allSettled([
        cleanupExpiredSessions(),
        cleanupExpiredCache(),
        retryFailedDocuments(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$distribution$2e$ts__$5b$instrumentation$5d$__$28$ecmascript$29$__["retryFailedDistributions"])()
    ]);
    return {
        sessions: sessions.status === "fulfilled" ? sessions.value : 0,
        cache: cache.status === "fulfilled" ? cache.value : 0,
        documents: documents.status === "fulfilled" ? documents.value : 0,
        distributions: distributions.status === "fulfilled" ? distributions.value : {
            total: 0,
            resolved: 0
        }
    };
}
let cleanupInterval = null;
function startPeriodicCleanup(intervalMs = 5 * 60 * 1000) {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(async ()=>{
        try {
            const result = await runAllCleanupJobs();
            if (result.sessions > 0 || result.cache > 0 || result.documents > 0 || result.distributions.total > 0) {
                console.log("[Cleanup]", JSON.stringify(result));
            }
        } catch (err) {
            console.error("[Cleanup] Error:", err);
        }
    }, intervalMs);
}
__turbopack_async_result__();
} catch(e) { __turbopack_async_result__(e); } }, false);}),
];

//# sourceMappingURL=_05a1b6ae._.js.map