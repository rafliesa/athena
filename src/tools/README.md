# Athena tools

Tools are intentionally split into small, independent layers:

- `types.ts` defines the provider-neutral contracts.
- `ToolRegistry.ts` handles discovery, execution, and stable result envelopes.
- `adapters/` converts neutral definitions into provider-specific declarations.
- `registry.ts` is the single composition root for the complete tool catalog and creates
  permission-filtered registries for providers.
- Domain folders contain one directory per tool, with definition, validation, safety, and execution
  concerns separated when useful.

Enabled tools are grouped by capability:

- `filesystem/scanDirectory/` lists directory entries without reading contents.
- `filesystem/findFiles/` finds files by name.
- `filesystem/searchText/` searches literal text with line and column locations.
- `filesystem/readFile/` reads bounded line ranges.
- `filesystem/writeFile/` creates files or replaces their full contents.
- `filesystem/editFile/` performs guarded exact-text replacements.
- `terminal/runCommand/` starts a bounded, non-interactive local process.

Each tool directory keeps its declaration (`index.ts`), runtime validation (`input.ts`), and
operation (`execute.ts`) separate. Reusable workspace containment, traversal, text decoding, and
atomic-write helpers live under `filesystem/shared/`. Provider-neutral input helpers live under
`shared/`.

## Safety model

Filesystem tools resolve lexical and real paths before use. Reads reject symlink escapes, writes
reject symbolic-link targets, traversal never follows symbolic links, and generated directories
such as `.git`, `coverage`, `dist`, and `node_modules` are excluded from recursive searches.
Text reads and searches are bounded and only accept valid UTF-8.

`run_command` is deliberately marked `process-execution`. Its starting directory must be inside
the workspace, but the child process is **not** contained by an operating-system sandbox. It
inherits Athena's host permissions and environment, so programs and build scripts may access
other paths or network resources. Use Athena only with models and repositories you trust until a
real process sandbox and approval policy are added.

Athena's persisted permissions map tool access metadata to runtime availability:

- `read-only` tools are always enabled;
- `workspace-write` tools require **Edit files**;
- `process-execution` tools require **Run terminal**.

Filtering happens before tools are advertised to either provider, and the filtered registry also
rejects direct execution of a disabled tool. Codex's built-in shell is disabled so terminal access
must pass through Athena's `process-execution` permission. Terminal permission is intentionally
stronger than file-edit permission: an allowed program may still modify files or access the
network using Athena's host privileges.

## Adding a tool

1. Implement an `AgentTool` in the appropriate domain folder.
2. Use a strict JSON schema: require every property and set `additionalProperties` to `false`.
3. Validate runtime input again inside the implementation.
4. Register the tool once in `registry.ts`.
5. Add execution, safety, provider-adapter, and `/tools` help tests.

Tool implementations should return structured, JSON-serializable data. The registry wraps successful
results and errors in a stable JSON envelope before returning them to a model.
