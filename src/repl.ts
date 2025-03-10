import prompts from 'prompts';
import { queryAI, Message, AIQueryError } from './ai/query';
import { config } from './config';
import { toolRegistry, ToolError } from './tools';
import { contextManager } from './context';
import { sessionManager } from './session';

/**
 * REPL (Read-Eval-Print Loop) interface for interactive sessions
 */
export class Repl {
  private isRunning: boolean = false;
  private exitRequested: boolean = false;
  private messages: Message[] = [];

  // Command history navigation
  private historyIndex: number = -1;

  constructor() {
    // Initialize with a system message to set the AI's behavior
    this.messages.push({
      role: 'system',
      content:
        'You are a helpful AI assistant for coding tasks. Help the user with their coding questions and tasks.',
    });
  }

  /**
   * Start the REPL session
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('REPL is already running');
      return;
    }

    this.isRunning = true;
    this.exitRequested = false;

    // Initialize the context manager and session manager
    await Promise.all([
      contextManager.initialize(),
      sessionManager.initialize(),
    ]);

    console.log('Welcome to Vibe CLI! Type "exit" or press Ctrl+C to exit.\n');
    console.log(
      `Using model: ${config.ollama.model} at ${config.ollama.apiUrl}\n`
    );
    console.log('Available commands:');
    console.log('  /tool <n> [args] - Execute a tool');
    console.log('  /tools              - List available tools');
    console.log('  /clear              - Clear the conversation history');
    console.log('  /exit               - Exit the REPL');
    console.log('  /history            - Show command history');
    console.log(
      '  /!<n>               - Recall and execute command at position n\n'
    );

    try {
      await this.loop();
    } catch (error) {
      console.error('Error in REPL session:', error);
    } finally {
      this.isRunning = false;

      // Save session data before exiting
      await sessionManager.saveSession();

      console.log('\nExiting Vibe CLI. Goodbye!');
      this.displaySessionSummary();
    }
  }

  /**
   * Stop the REPL session
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.exitRequested = true;
  }

  /**
   * Main REPL loop
   */
  private async loop(): Promise<void> {
    // Get the command history from the session manager
    const commandHistory = sessionManager.getCommandHistory();
    this.historyIndex = commandHistory.length;

    while (this.isRunning && !this.exitRequested) {
      // Use a custom prompt that supports history navigation
      const response = await prompts(
        {
          type: 'text',
          name: 'input',
          message: '> ',
          validate: value => value !== undefined && value.trim() !== '',
          initial:
            this.historyIndex >= 0 && this.historyIndex < commandHistory.length
              ? commandHistory[this.historyIndex]
              : '',
          suggest: (input: string) =>
            Promise.resolve(
              commandHistory.filter(cmd => cmd.startsWith(input))
            ),
        },
        {
          onCancel: () => {
            this.stop();
            return true;
          },
          // Handle special keys for history navigation
          onSubmit: (_prompt, answer) => {
            if (answer && answer.trim() !== '') {
              // Add to history via session manager
              sessionManager.addToHistory(answer);
              this.historyIndex = sessionManager.getCommandHistory().length;
            }
            return true;
          },
        }
      );

      const input = response.input as string | undefined;

      if (input === undefined) {
        // User pressed Ctrl+C
        break;
      }

      if (input.toLowerCase() === 'exit') {
        this.stop();
        break;
      }

      // Check if the input is a command
      if (input.startsWith('/')) {
        await this.processCommand(input);
      } else {
        await this.processMessage(input);
      }
    }
  }

  /**
   * Process a command
   * @param input Command input string
   */
  private async processCommand(input: string): Promise<void> {
    // Check for history recall (e.g., /!5)
    const historyRecallMatch = input.match(/^\/!(\d+)$/);
    if (historyRecallMatch) {
      const historyIndex = parseInt(historyRecallMatch[1], 10) - 1;
      const commandHistory = sessionManager.getCommandHistory();

      if (historyIndex >= 0 && historyIndex < commandHistory.length) {
        const recalledCommand = commandHistory[historyIndex];
        console.log(`Recalling command: ${recalledCommand}`);

        // If it's a command, process it as a command
        if (recalledCommand.startsWith('/')) {
          return this.processCommand(recalledCommand);
        } else {
          // Otherwise process it as a message
          return this.processMessage(recalledCommand);
        }
      } else {
        console.log(`Invalid history index: ${historyIndex + 1}`);
        return;
      }
    }

    // Split by space, but respect quoted strings
    const parts = this.parseCommandLine(input);
    const command = parts[0].substring(1).toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'exit':
        this.stop();
        break;

      case 'clear':
        this.messages = this.messages.slice(0, 1); // Keep only the system message
        console.log('Conversation history cleared.');
        break;

      case 'history':
        this.displayCommandHistory();
        break;

      case 'tools':
        const tools = toolRegistry.getAll();
        console.log(`Available tools (${tools.length}):\n`);
        tools.forEach(tool => {
          console.log(`- ${tool.name}: ${tool.description}`);
        });
        break;

      case 'tool':
        if (args.length === 0) {
          console.log('Usage: /tool <n> [args]');
          return;
        }

        const toolName = args[0];
        if (!toolRegistry.has(toolName)) {
          console.log(
            `Tool "${toolName}" not found. Use /tools to see available tools.`
          );
          return;
        }

        try {
          // Parse tool arguments
          const toolArgs: Record<string, unknown> = {};

          if (toolName === 'listDir' && args.length > 1) {
            // Special case for listDir: the second argument is the path
            toolArgs.path = args[1];
          } else if (toolName === 'readFile' && args.length > 1) {
            // Special case for readFile: the second argument is the path
            toolArgs.path = args[1];

            // If there's a third argument, it's the encoding
            if (args.length > 2) {
              toolArgs.encoding = args[2];
            }
          } else {
            // Generic argument parsing for other tools
            for (let i = 1; i < args.length; i++) {
              const arg = args[i];
              const [key, value] = arg.split('=');
              if (key && value) {
                toolArgs[key] = value;
              }
            }
          }

          console.log(`Executing tool "${toolName}"...`);
          const result = await toolRegistry.execute(toolName, toolArgs);
          console.log('Result:', JSON.stringify(result, null, 2));
        } catch (error) {
          if (error instanceof ToolError) {
            console.error(`Tool error: ${error.message}`);
          } else {
            console.error(`Error executing tool: ${error}`);
          }
        }
        break;

      default:
        console.log(`Unknown command: ${command}`);
        break;
    }
  }

  /**
   * Parse a command line into arguments, respecting quoted strings
   * @param input Command line input
   * @returns Array of arguments
   */
  private parseCommandLine(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let escapeNext = false;

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (escapeNext) {
        current += char;
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ' ' && !inQuotes) {
        if (current) {
          args.push(current);
          current = '';
        }
        continue;
      }

      current += char;
    }

    if (current) {
      args.push(current);
    }

    return args;
  }

  /**
   * Process a user message
   * @param prompt User message
   */
  private async processMessage(prompt: string): Promise<void> {
    // Define an update callback that handles streaming updates
    const onUpdate = (_content: string, _isDone: boolean) => {
      // We're not using the content here but it would be used
      // in a more advanced implementation with streaming UI
    };

    try {
      // Add user message to the conversation history
      this.messages.push({
        role: 'user',
        content: prompt,
      });

      // Use the context manager to enhance the messages with project context
      const enhancedMessages = contextManager.enhanceMessages(this.messages);

      // Query the AI
      const aiResponse = await queryAI(enhancedMessages, onUpdate);

      // Add assistant message to the conversation history
      this.messages.push({
        role: 'assistant',
        content: aiResponse,
      });
    } catch (error) {
      if (error instanceof AIQueryError) {
        console.error('Error querying AI:', error.message);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  }

  /**
   * Display command history
   */
  private displayCommandHistory(): void {
    const commandHistory = sessionManager.getCommandHistory();

    if (commandHistory.length === 0) {
      console.log('Command history is empty.');
      return;
    }

    console.log('Command history:');
    commandHistory.forEach((cmd, index) => {
      console.log(`${index + 1}. ${cmd}`);
    });
  }

  /**
   * Display session summary
   */
  private displaySessionSummary(): void {
    const metadata = sessionManager.getMetadata();
    const { startTime, commandCount, duration } = metadata;

    console.log('\nSession Summary:');
    console.log(`- Start time: ${startTime.toLocaleString()}`);
    console.log(`- Duration: ${Math.round(duration)} seconds`);
    console.log(`- Commands executed: ${commandCount}`);
  }
}
