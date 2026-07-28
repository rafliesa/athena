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
and are not read or stored by Athena.

Model output is streamed into the terminal as it is generated. Use `/logout` to remove Athena's
local provider configuration and return to the setup screen. When using Codex authentication,
`/logout` also signs out the Codex CLI session.

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
├── domain/                         # Models, commands, messages, and core types
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
└── screens/                        # Thin authentication and chat orchestration
```

Protocol code, application state, persistence, and rendering are intentionally isolated so new
providers and agent capabilities can be added without coupling them to the terminal UI.

## Roadmap

Planned areas of development include:

- agent execution loop;
- model and provider integrations;
- tool calling for file and command operations;
- sandboxing and execution timeouts;
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
