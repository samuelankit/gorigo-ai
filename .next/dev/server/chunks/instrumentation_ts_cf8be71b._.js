module.exports = [
"[project]/instrumentation.ts [instrumentation] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "register",
    ()=>register
]);
async function register() {
    if ("TURBOPACK compile-time truthy", 1) {
        const { startPeriodicCleanup } = await __turbopack_context__.A("[project]/lib/cleanup.ts [instrumentation] (ecmascript, async loader)");
        startPeriodicCleanup(5 * 60 * 1000);
        console.log("[GoRigo] Background cleanup started (5 min interval)");
        const { startAutomationEngine } = await __turbopack_context__.A("[project]/lib/automation-engine.ts [instrumentation] (ecmascript, async loader)");
        startAutomationEngine(10 * 60 * 1000);
        console.log("[GoRigo] Automation engine started (10 min interval)");
    }
}
}),
];

//# sourceMappingURL=instrumentation_ts_cf8be71b._.js.map