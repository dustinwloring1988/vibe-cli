# Vibe CLI Quick Start Guide

Welcome to Vibe CLI, your terminal-based AI coding assistant powered by Ollama models. This guide will help you get up and running with vibe-cli in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- [Ollama](https://ollama.ai) (running locally or on a remote server)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dustinwloring1988/vibe-cli.git
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

## Basic Usage

### Test Your Connection

First, verify that vibe-cli can connect to your Ollama instance:

```bash
vibe test-connection
```

If this fails, check that Ollama is running and update your configuration.

### Basic Commands

- **Get Help**: `vibe --help`
- **Agent Mode**: `vibe agent`
- **Single Query**: `vibe query "How do I use async/await in JavaScript?"`
- **Configuration**: `vibe config`
- **Session Management**: `vibe session`

## Using Agent Mode

Agent mode provides an AI assistant that can use tools to help you with coding tasks:

```bash
vibe agent
```

Example interaction:
```
You: I need help with creating a React component that fetches data from an API
AI: I'll help you create a React component that fetches data from an API. Let's break this down step by step...
[component code follows]
```

### Customizing Agent Behavior

You can customize the agent's behavior with command-line options:

```bash
vibe agent --personality detailed --verbosity high
```

Available personalities:
- `helpful` (default): General assistance
- `concise`: Brief, to-the-point responses
- `detailed`: Comprehensive explanations
- `teaching`: Educational style with explanations

## Project Context

For project-specific assistance, create a `VIBE.md` file in your project root:

```markdown
# Project: MyProject

## Purpose
A web application for managing tasks

## Technologies
- React
- TypeScript
- Express.js backend

## Coding Guidelines
- Use functional components
- Follow ESLint rules
- Write unit tests for components
```

When you run vibe-cli in this directory, it will use this information to provide more relevant assistance.

## Configuration

View your current configuration:

```bash
vibe config
```

Edit a specific setting:

```bash
vibe config --action edit --property ollama.model --value codellama
```

## Session Management

Your conversations are automatically saved. View your session info:

```bash
vibe session
```

List available backups:

```bash
vibe session --action list-backups
```

Restore a previous session:

```bash
vibe session --action restore --path ~/.vibe-cli/backups/session-backup-2025-03-10T12-34-56.json
```

## Next Steps

- Explore available tools with `vibe tools`
- Review the full documentation in the README.md file
- Check out example use cases in the docs/examples/ directory

## Troubleshooting

If you encounter issues:

1. Check Ollama is running: `ps aux | grep ollama`
2. Verify your configuration: `vibe config`
3. Look at the logs in the `logs/` directory
4. Reset to default configuration: `vibe config --action reset`

For more help, please [open an issue](https://github.com/dustinwloring1988/vibe-cli/issues) on GitHub. 