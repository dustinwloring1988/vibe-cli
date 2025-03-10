# Vibe CLI

A terminal-based AI coding agent powered by Ollama models, designed to assist with coding tasks directly from your terminal.

## Features

- Interactive chat with AI assistant
- Agent mode with autonomous tool capabilities
- Project context awareness via VIBE.md
- File system operations with security controls
- Streaming responses for real-time feedback
- Simple and intuitive command-line interface
- Customizable REPL prompt with visual state indicators
- Global configuration storage and management
- Session persistence with automatic backups
- Comprehensive logging system with log rotation
- Extensive error handling and recovery

## Quick Start Guide

1. **Install the CLI:**
   ```bash
   # Clone the repository
   git clone https://github.com/dustinwloring1988/vibe-cli.git
   cd vibe-cli

   # Install dependencies and build
   npm install
   npm run build
   npm link
   ```

2. **Run a quick test:**
   ```bash
   # Test connection to Ollama
   vibe test-connection
   ```

3. **Start using the AI agent:**
   ```bash
   # Start agent mode
   vibe agent

   # For a simple query
   vibe query "How do I create a React component?"
   ```

4. **Get help at any time:**
   ```bash
   vibe --help           # General help
   vibe agent --help     # Agent mode options
   vibe config --help    # Configuration options
   vibe session --help   # Session management options
   ```

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

3. Set up environment variables (optional):
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

### Troubleshooting Installation

- **Permission Issues**: If you encounter permission errors during `npm link`, try using `sudo npm link` on Linux/macOS
- **Command Not Found**: Ensure your npm bin directory is in your PATH
- **Ollama Connection Issues**: Verify Ollama is running with `ps aux | grep ollama` or check its service status

## Usage

### Interactive REPL

Start an interactive REPL session with the AI assistant:

```bash
vibe repl
```

In the REPL session, you can:
- Type your questions or commands
- Press Ctrl+C or type `/exit` to end the session
- Type `/tools` to see available tools
- Type `/tool <name> [args]` to execute a tool
- Use up/down arrow keys to navigate command history

### Agent Mode

Start an interactive session with an AI assistant that can use tools autonomously:

```bash
vibe agent [options]
```

Options:
- `--personality <type>`: Set personality (helpful, concise, detailed, teaching)
- `--verbosity <level>`: Set verbosity level (low, medium, high)
- `--markdown`: Enable/disable markdown formatting
- `--debug`: Enable debug mode

Example:
```bash
vibe agent --personality teaching --verbosity high
```

In agent mode, the AI can:
- Access the file system (read/write files, list directories)
- Create, modify, and delete files with permission safeguards
- Provide context-aware assistance based on your project
- Automatically use tools when needed without explicit commands

### One-time Query

Send a one-off query to the AI assistant:

```bash
vibe query "What's the difference between let and const in JavaScript?"
```

### Configuration Management

Manage global configuration settings:

```bash
# View entire configuration
vibe config

# View specific configuration value
vibe config --action view --property ollama.apiUrl

# Set configuration value
vibe config --action edit --property ollama.apiUrl --value http://localhost:11434/api

# Edit configuration in text editor
vibe config --action edit --editor

# Reset configuration to defaults
vibe config --action reset

# Show configuration file path
vibe config --action path
```

The configuration is stored in `~/.viberc.json` and persists between sessions.

### Session Management

Manage conversation sessions:

```bash
# Show current session information
vibe session

# List available session backups
vibe session --action list-backups

# Restore session from backup
vibe session --action restore --path <backup-path>

# Clear conversation history
vibe session --action clear

# Create a backup of the current session
vibe session --action backup
```

Sessions are automatically backed up periodically and stored in `~/.vibe-cli/backups/`.

### Project Context

Create a `VIBE.md` file in your project root to provide context-specific instructions to the AI assistant. This helps the AI understand your project and provide more relevant assistance.

Example `VIBE.md`:
```markdown
# Project: MyAwesomeApp

## Overview
This is a React application using TypeScript and Redux for state management.

## Coding Guidelines
- Use functional components with hooks
- Follow Airbnb style guide
- Use Redux Toolkit for all state management
- Write unit tests for all components

## Project Structure
- src/components: React components
- src/store: Redux store configuration
- src/api: API client code
- src/utils: Utility functions
```

### Test Ollama Connection

Verify your connection to the Ollama server:

```bash
vibe test-connection
```

### Available Tools

The agent has access to the following tools:

- **listDir**: Lists files and directories
- **readFile**: Reads the content of a file
- **writeFile**: Writes content to a file (with overwrite confirmation)
- **createFile**: Creates a new file
- **deleteFile**: Deletes a file (with confirmation)
- **mkdir**: Creates directories recursively
- **moveFile**: Moves or renames files

## Configuration

### Global Configuration

The application stores its configuration in `~/.viberc.json`. This can be managed using the `vibe config` command.

Default configuration:
```json
{
  "ollama": {
    "apiUrl": "http://localhost:11434/api",
    "model": "llama3"
  },
  "app": {
    "logLevel": "info",
    "debug": false
  },
  "agent": {
    "personality": "helpful",
    "verbosity": "normal",
    "useMarkdown": true
  },
  "prompt": {
    "style": "default",
    "colors": {
      "default": "blue",
      "ready": "green",
      "busy": "yellow",
      "error": "red"
    },
    "symbols": {
      "default": ">",
      "ready": "✓",
      "busy": "⟳",
      "error": "✗"
    }
  }
}
```

### Environment Variables

You can also use environment variables to override configuration:

- `OLLAMA_API_URL` - URL of the Ollama API
- `OLLAMA_MODEL` - Name of the Ollama model to use
- `DEBUG` - Enable debug mode (`true`/`false`)
- `LOG_LEVEL` - Set logging level (`debug`/`info`/`warn`/`error`)

Agent configuration:
- `AGENT_PERSONALITY` - Personality type
- `AGENT_VERBOSITY` - Verbosity level
- `AGENT_USE_MARKDOWN` - Enable markdown formatting (`true`/`false`)

Prompt customization:
- `PROMPT_STYLE` - Prompt style (`default`/`emoji`/`minimal`/`detailed`)
- `PROMPT_COLOR_DEFAULT` - Color for the default state
- `PROMPT_COLOR_READY` - Color for the ready state
- `PROMPT_COLOR_BUSY` - Color for the busy state
- `PROMPT_COLOR_ERROR` - Color for the error state
- `PROMPT_SYMBOL_DEFAULT` - Symbol for the default state
- `PROMPT_SYMBOL_READY` - Symbol for the ready state
- `PROMPT_SYMBOL_BUSY` - Symbol for the busy state
- `PROMPT_SYMBOL_ERROR` - Symbol for the error state

## Logging System

Vibe CLI includes a comprehensive logging system:

- **Action Logs**: All tool executions are logged to `logs/actions.log`
- **Error Logs**: Errors are logged to `logs/error.log`
- **Log Rotation**: Logs are automatically rotated to prevent excessive file growth

## Development

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Build and run the project
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:logs` - Test logging functionality

### Project Structure

```
vibe-cli/
├── src/
│   ├── ai/
│   │   └── query.ts       # AI query functionality
│   ├── bin/
│   │   ├── vibe.ts        # CLI entry point
│   │   ├── config-cmd.ts  # Configuration command handler
│   │   └── session-cmd.ts # Session command handler
│   ├── logging/
│   │   ├── logger.ts      # Logging system
│   │   └── errorHandler.ts # Error handling utilities
│   ├── tools/             # Tool implementations
│   │   ├── filesystem/    # Filesystem tools
│   │   ├── interface.ts   # Tool interface definitions
│   │   ├── registry.ts    # Tool registry 
│   │   └── loader.ts      # Tool loading system
│   ├── context.ts         # Project context management
│   ├── config.ts          # App configuration
│   ├── configManager.ts   # Configuration persistence
│   ├── agent.ts           # Agent REPL implementation
│   ├── repl.ts            # Interactive REPL implementation
│   ├── prompt.ts          # Customizable prompt system
│   ├── session.ts         # Session management
│   └── index.ts           # Main exports
├── VIBE.md                # Project instructions for AI
├── dist/                  # Compiled output
├── logs/                  # Log files
├── tsconfig.json          # TypeScript configuration
└── package.json           # Project metadata
```

## Frequently Asked Questions

### Which Ollama models work best?
While vibe-cli works with most Ollama models, we recommend:
- `llama3` - Good all-around performance
- `codellama` - Better for programming tasks
- `mistral` - Good balance of speed and quality

### How can I secure my code data?
All interactions happen locally - your code never leaves your machine. Ollama runs locally and does not send your code to external servers.

### How can I customize the AI's behavior?
Use the agent options (`--personality`, `--verbosity`) or edit the configuration file to change the AI's behavior. You can also provide a `VIBE.md` file in your project to give context-specific instructions.

### How do I recover a previous session?
Use `vibe session --action list-backups` to see available backups, then `vibe session --action restore --path <backup-path>` to restore a specific backup.

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request