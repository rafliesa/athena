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
- Prettier — code formatting and consistency.

## Getting Started

Make sure Node.js and npm are installed, then run:

```bash
npm install
npm run dev
```

Available commands:

```bash
npm run build          # Compile TypeScript into dist/
npm run start          # Run the compiled application
npm run format         # Format the source code
npm run format:check   # Check formatting without changing files
npm test               # Run the test suite
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

Contributions and feedback are welcome while the project is in the WIP stage. Before submitting changes, make sure the following checks pass:

```bash
npm run format:check
npm run build
npm test
```

## License

The project license has not been established yet.
