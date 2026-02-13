module.exports = [
"[project]/lib/distribution.ts [instrumentation] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/lib_540a97b2._.js",
  "server/chunks/_551ed1cd._.js",
  "server/chunks/[root-of-the-server]__d7cb3056._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/lib/distribution.ts [instrumentation] (ecmascript)");
    });
});
}),
"[project]/lib/audit.ts [instrumentation] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/_6abe8be9._.js",
  "server/chunks/[root-of-the-server]__d7cb3056._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/lib/audit.ts [instrumentation] (ecmascript)");
    });
});
}),
];