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
```

## Project Structure

```text
src/
├── app.tsx                  # Main application layout
├── cli.tsx                  # CLI entry point
├── types.ts                 # Shared types
├── components/              # Terminal UI components
│   ├── Footer.tsx
│   ├── MessageView.tsx
│   └── Prompt.tsx
└── hooks/
    └── usePrompt.ts         # Prompt input and lifecycle handling
```

The project is intentionally structured this way so agent execution, tool handling, context management, and testing capabilities can be added without making the main UI component difficult to maintain.

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
```

## License

The project license has not been established yet.
