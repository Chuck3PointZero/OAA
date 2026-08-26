# Changelog

All notable changes to `@oaa/ontology` are documented here.

## 0.6.0 — 2026-08-26

### Changed

- **Version bump for alignment with `@oaa/harness` v0.6.0.** No functional changes in this release; version kept in lockstep with the harness so a single release tag reaches both servers.

## 0.5.0 — 2026-08-05

### Changed

- **Version bump for alignment with `@oaa/harness` v0.5.0.** No functional changes in this release, but updated to stay in sync with the core architecture and authority algebra updates.

## 0.4.0 — 2026-07-06

### Security

- **`query_concept` SQL injection guard.** Filter keys passed to `query_concept` are now validated against the entity's declared properties, relations (FK columns), and audit columns (`_updated_at`, `_source`) before being used in the SQL `WHERE` clause. An unknown column returns an error instead of being injected as a raw identifier.

### Fixed

- **`compile_schema` creates the output directory if it doesn't exist.** Previously calling `compile_schema` before the `ontology/` subdirectory existed would throw a file-not-found error from `writeFileSync`. `mkdirSync` with `{ recursive: true }` now runs before the write.
- **`write_entity` and `query_concept` guard against rootDir mismatch.** If either tool is called with a `rootDir` that differs from the one used to initialise the store (via `compile_schema`), the call returns an actionable error message instead of silently operating against the wrong schema.
- **Parser EOF handling.** Repeated calls to `advance()` past the end of the token stream now return the EOF token rather than `undefined`, preventing downstream crashes on malformed or truncated `.rel` source files.
- **MCP server advertises the version from `package.json`.** The server reads its own `package.json` at startup via `createRequire`; the version field is no longer a hard-coded string that can drift from the package.
- **`prepare` script added.** `npm install` now triggers `npm run build` automatically, so the `dist/` directory is always present after install without a separate build step.
