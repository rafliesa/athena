<p align="center">
  <img src="./athena.png" alt="Athena logo" width="256" />
</p>

# Athena

Athena is a **lightweight agent harness** for experimenting with coding-agent workflows in the terminal. It is designed with a simple, modular structure so the UI, prompt handling, harness engine, and evaluator can evolve independently.

> **Status: Work in Progress (WIP)**
>
> Athena is currently under active development. Internal APIs, module structure, and harness behavior may change before a stable release.

## Goals

Athena is intended to provide a lightweight foundation for building and testing coding agents locally, with a focus on:

- a simple terminal-based interface;
- a modular and extensible architecture;
- clear separation between the UI, input handling, execution engine, and evaluator;
- fast experimentation without the overhead of a large framework.

## Technology

- [Ink](https://github.com/vadimdemedes/ink) — terminal UI built with React;
- React — UI components;
- TypeScript — type-safe application development;
- ESLint and Prettier — type-aware linting and consistent formatting;
- Vitest — unit, integration, and coverage testing.

## Getting Started

Athena uses Node.js 24 LTS and npm 11 or newer. If you use `nvm`, the repository includes an
`.nvmrc` file:

```bash
nvm use
npm install
npm run dev
```

Available commands:

```bash
npm run build          # Compile TypeScript into dist/
npm run start          # Run the compiled application
npm run lint           # Run type-aware ESLint checks
npm run lint:fix       # Apply safe ESLint fixes
npm run format         # Format the source code
npm run format:check   # Check formatting without changing files
npm run typecheck      # Type-check without emitting files
npm test               # Run the test suite
npm run test:coverage  # Run tests with enforced coverage thresholds
npm run check          # Run all local quality gates
```

## Providers

On the first launch, Athena opens an interactive setup and asks you to choose one of two
authentication methods:

- **OpenAI API key** — validates the key and uses the OpenAI Responses API;
- **Codex login** — reuses an existing Codex session or starts the OAuth device flow.

Athena defaults to `gpt-5.6-luna`, the fastest and lowest-cost tier in the latest model family.
Use `/model` inside the application to switch between Luna, Terra, and Sol.

Provider settings are stored in `~/.config/athena/config.json`. API keys are stored locally in that
file with mode `0600`; never commit or share this file. Codex credentials remain managed by Codex
and are not read or stored by Athena. Agent permissions are stored in the same Athena config.

Model output is streamed into the terminal as it is generated. Use `/logout` to remove Athena's
local provider configuration and return to the setup screen. This does not sign out the shared
Codex CLI session, so other Codex clients remain authenticated.

## Agent Tools

Athena exposes provider-neutral coding tools through a modular registry:

- `scan_directory` — inspect directory entries recursively;
- `find_files` — find files by a literal name substring;
- `search_text` — search UTF-8 file contents with line and column locations;
- `read_file` — read a bounded line range;
- `write_file` — create a file or explicitly replace all of its contents;
- `edit_file` — replace exact text only when the expected match count is correct;
- `run_command` — run one non-interactive executable with bounded output and a timeout.

Use `/permissions` to configure the two mutating capability groups:

- **Edit files** controls `write_file` and `edit_file`;
- **Run terminal** controls `run_command`.

Read-only inspection tools are always available. File editing is enabled by default and remains
restricted to the current workspace. Terminal execution is disabled by default because child
processes inherit Athena's host permissions. Saving the permission menu persists the selection and
rebuilds the provider with only the allowed tools; a blocked tool is not advertised to the model
and cannot be executed through Athena's tool runtime.

Filesystem tools stay inside the current workspace, reject path and symlink escapes, and skip
generated directories such as `.git`, `coverage`, `dist`, and `node_modules` during traversal.
Writes reject symbolic-link targets and use atomic replacement where applicable.

`run_command` validates that its starting directory is inside the workspace, but it is trusted
local execution rather than an OS sandbox. A child process inherits Athena's host permissions and
may access other filesystem locations or network resources. Run Athena only with repositories and
models you trust until process sandboxing and approvals are implemented.

Use `/tools` inside Athena to see every enabled tool, its access level, description, and input
parameters. Tool contracts, registry behavior, provider adapters, and domain implementations are
kept separate so tools can be added without coupling them to the terminal UI or a specific model
provider.

## Project Structure

```text
src/
├── app.tsx                         # Application root and screen routing
├── cli.tsx                         # CLI entry point
├── auth/                           # OpenAI and Codex authentication
├── chat/                           # Conversation state and streaming updates
├── commands/                       # Command registry and command handlers
├── components/                     # Reusable terminal UI components
├── config/                         # Validated local configuration
├── domain/                         # Models, commands, permissions, messages, and core types
├── providers/
│   ├── provider.ts                 # Provider contract
│   ├── createProvider.ts           # Provider factory
│   ├── codex/
│   │   ├── AppServerClient.ts      # Codex JSON-RPC transport
│   │   └── CodexProvider.ts        # Codex streaming adapter
│   └── openai/
│       ├── OpenAIProvider.ts       # Responses API streaming adapter
│       └── sse.ts                  # Incremental SSE decoder
├── hooks/                          # Prompt and authentication state hooks
├── screens/                        # Thin authentication and chat orchestration
└── tools/
    ├── types.ts                    # Provider-neutral tool contracts
    ├── ToolRegistry.ts             # Discovery, execution, and result envelopes
    ├── registry.ts                 # Enabled tool composition root
    ├── formatToolHelp.ts           # Human-readable /tools output
    ├── adapters/                   # OpenAI and Codex declaration adapters
    ├── shared/                     # Provider-neutral input validation
    ├── filesystem/
    │   ├── shared/                 # Path, traversal, text, and atomic-write helpers
    │   ├── scanDirectory/          # Directory inspection
    │   ├── findFiles/              # File-name search
    │   ├── searchText/             # File-content search
    │   ├── readFile/               # Bounded text reads
    │   ├── writeFile/              # Create and complete replacement
    │   └── editFile/               # Guarded targeted replacement
    └── terminal/
        └── runCommand/             # Bounded process execution
```

Protocol code, application state, persistence, and rendering are intentionally isolated so new
providers and agent capabilities can be added without coupling them to the terminal UI.

## Roadmap

Planned areas of development include:

- agent execution loop;
- model and provider integrations;
- OS-level process sandboxing and approval policies;
- context and session management;
- test runner and evaluator;
- unit and integration tests;
- configuration through files or environment variables.

## Contributing

Contributions and feedback are welcome while the project is in the WIP stage. Run the complete
local quality gate before submitting changes:

```bash
npm run check
```

Git hooks are installed automatically by `npm install`:

- `pre-commit` formats and lints staged files through lint-staged;
- `commit-msg` enforces Conventional Commits such as `feat: add tool execution`;
- `pre-push` runs the complete local quality gate.

GitHub Actions repeats formatting, linting, type-checking, coverage tests, builds, and pull-request
commit validation. Current global coverage minimums are 85% for statements, functions, and lines,
and 75% for branches.

## License

The project license has not been established yet.
