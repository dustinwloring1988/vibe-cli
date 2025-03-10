# Vibe CLI

A terminal-based AI coding agent powered by Ollama models, designed to assist with coding tasks directly from your terminal.

## Features

- Interactive chat with AI assistant
- One-off queries to the AI assistant
- Streaming responses for real-time feedback
- Simple and intuitive command-line interface

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Install from source

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/vibe-cli.git
   cd vibe-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Link the package globally:
   ```bash
   npm link
   ```

## Usage

### Interactive Chat

Start an interactive chat session with the AI assistant:

```bash
vibe chat
```

In the chat session, you can:
- Type your questions or commands
- Press Ctrl+C or type `exit` to end the session

### One-off Query

Send a one-off query to the AI assistant:

```bash
vibe query "How do I create a React component?"
```

### Help

Get help on available commands:

```bash
vibe --help
```

## Development

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Build and run the project
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

### Project Structure

```
vibe-cli/
├── src/
│   ├── ai/
│   │   └── query.ts       # AI query functionality
│   ├── bin/
│   │   └── vibe.ts        # CLI entry point
│   ├── tools/             # Tool implementations
│   ├── repl.ts            # Interactive REPL implementation
│   └── index.ts           # Main exports
├── dist/                  # Compiled output
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.