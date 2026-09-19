function hasVitestGlobal() {
    const runtime = globalThis;
    return '__vitest_browser__' in runtime || '__vitest_worker__' in runtime;
}
function hasProcessTestEnv() {
    if (typeof process === 'undefined' || !process.env) {
        return false;
    }
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}
export function isTestMode() {
    return hasVitestGlobal() || hasProcessTestEnv();
}
