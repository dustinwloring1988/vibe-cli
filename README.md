# Vibe CLI

A terminal-based AI coding agent powered by Ollama models, designed to assist with coding tasks directly from your terminal.

## Features

- Interactive chat with AI assistant
- Agent mode with tool capabilities
- Project context awareness via VIBE.md
- File system operations with security controls
- Streaming responses for real-time feedback
- Simple and intuitive command-line interface

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Ollama (running locally or on a remote server)

### Install from source

1. Clone the repository:
   ```bash
   git clone https://github.com/dustinwloring1988/vibe-cli.git
   cd vibe-cli
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file to configure your Ollama API URL and model.

4. Build the project:
   ```bash
   npm run build
   ```

5. Link the package globally:
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
- Press Ctrl+C or type `/exit` to end the session
- Type `/tools` to see available tools
- Type `/tool <name> [args]` to execute a tool

### Agent Mode

Start an interactive session with an AI assistant that can use tools autonomously:

```bash
vibe agent
```

In agent mode, the AI can:
- Access the file system to read files and list directories
- Provide context-aware assistance based on your project
- Automatically use tools when needed without explicit commands

### Project Context

Create a `VIBE.md` file in your project root to provide context-specific instructions to the AI assistant. This helps the AI understand your project and provide more relevant assistance.

### Test Ollama Connection

Verify your connection to the Ollama server:

```bash
vibe test-connection
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
│   │   ├── filesystem/    # Filesystem tools
│   │   ├── interface.ts   # Tool interface definitions
│   │   ├── registry.ts    # Tool registry 
│   │   └── loader.ts      # Tool loading system
│   ├── context.ts         # Project context management
│   ├── config.ts          # App configuration
│   ├── agent.ts           # Agent REPL implementation
│   ├── repl.ts            # Interactive REPL implementation
│   └── index.ts           # Main exports
├── VIBE.md                # Project instructions for AI
├── dist/                  # Compiled output
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## Configuration

The application can be configured using environment variables:

- `OLLAMA_API_URL` - URL of the Ollama API (default: `http://localhost:11434/api`)
- `OLLAMA_MODEL` - Name of the Ollama model to use (default: `llama3`)
- `DEBUG` - Enable debug mode (default: `false`)
- `LOG_LEVEL` - Set logging level (default: `info`)

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.