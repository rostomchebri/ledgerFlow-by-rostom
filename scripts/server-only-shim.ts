/**
 * Standalone worker aliases `server-only` to this empty module.
 *
 * Next.js resolves `server-only` through its bundler, but the same package is
 * not a runtime dependency and would fail when `pnpm jobs:worker` runs plain
 * Node/tsx. Only `scripts/tsconfig.worker.json` points here; the application
 * build keeps Next's server-only guarantee.
 */
export {};
