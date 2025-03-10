# VIBE CLI - Project Instructions

## Overview

The VIBE CLI is a terminal-based AI assistant designed for software developers. It provides an interactive REPL interface with context-aware AI assistance and tool capabilities.

## Goals

1. Provide a minimal but powerful CLI interface for AI interactions
2. Support tools that can access the filesystem and perform operations
3. Ensure proper security controls for sensitive operations
4. Maintain a project context to enable more helpful AI responses

## Development Guidelines

- Focus on a clean and maintainable codebase
- Use TypeScript with strict typing
- Follow ESLint and Prettier standards
- Write clear documentation for all features
- Prioritize user experience and security

## Security Considerations

- Implement permission controls for filesystem access
- Prevent access to sensitive files and directories
- Validate all user input to prevent security issues
- Do not store or transmit sensitive information

## Usage Examples

```
# Start a chat session
vibe chat

# Start an agent session with tool access
vibe agent

# Test connection to Ollama
vibe test-connection
``` 