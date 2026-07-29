# Athena tools

Tools are intentionally split into small, independent layers:

- `types.ts` defines the provider-neutral contracts.
- `ToolRegistry.ts` handles discovery, execution, and stable result envelopes.
- `adapters/` converts neutral definitions into provider-specific declarations.
- `registry.ts` is the single composition root for tools enabled in Athena.
- Domain folders contain one directory per tool, with definition, validation, safety, and execution
  concerns separated when useful.

`filesystem/scanDirectory/` is the reference implementation:

- `index.ts` exposes the tool definition.
- `input.ts` validates model-provided arguments.
- `pathSafety.ts` keeps resolved paths inside the workspace.
- `execute.ts` performs deterministic, bounded traversal.

## Adding a tool

1. Implement an `AgentTool` in the appropriate domain folder.
2. Use a strict JSON schema: require every property and set `additionalProperties` to `false`.
3. Validate runtime input again inside the implementation.
4. Register the tool once in `registry.ts`.
5. Add execution, safety, provider-adapter, and `/tools` help tests.

Tool implementations should return structured, JSON-serializable data. The registry wraps successful
results and errors in a stable JSON envelope before returning them to a model.
