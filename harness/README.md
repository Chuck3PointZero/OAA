# OAA harness (source of the utility)

The `oaa-harness` MCP server is no longer started by the plugin. This folder holds the TypeScript source that is bundled into `skills/org-agent-architecture/assets/oaa.mjs`, the utility the OAA prompts run (`node .oaa/oaa.mjs compile`, `validate`, and so on).

## Build the utility

```bash
cd harness
npm install
npm run bundle
```

`npm run bundle` writes `../skills/org-agent-architecture/assets/oaa.mjs`. Rebuild it after any change under `src/`, and commit the bundle with the source. A rebuild from an unchanged `src/` gives the same file.

## Source

- `src/cli.ts`: the command-line entry point the bundle is built from.
- `src/`: the compiler and validator the entry point uses.
