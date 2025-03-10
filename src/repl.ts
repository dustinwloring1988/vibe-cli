import prompts from 'prompts';
import { queryAI, Message, MessageCallback, AIQueryError } from './ai/query';
import { config } from './config';
import { toolRegistry, ToolError } from './tools';

/**
 * REPL (Read-Eval-Print Loop) interface for interactive sessions
 */
export class Repl {
  private isRunning: boolean = false;
  private exitRequested: boolean = false;
  private messages: Message[] = [];

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

    console.log('Welcome to Vibe CLI! Type "exit" or press Ctrl+C to exit.\n');
    console.log(
      `Using model: ${config.ollama.model} at ${config.ollama.apiUrl}\n`
    );
    console.log('Available commands:');
    console.log('  /tool <name> [args] - Execute a tool');
    console.log('  /tools              - List available tools');
    console.log('  /clear              - Clear the conversation history');
    console.log('  /exit               - Exit the REPL\n');

    try {
      await this.loop();
    } catch (error) {
      console.error('Error in REPL session:', error);
    } finally {
      this.isRunning = false;
      console.log('\nExiting Vibe CLI. Goodbye!');
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
    while (this.isRunning && !this.exitRequested) {
      const response = await prompts(
        {
          type: 'text',
          name: 'input',
          message: '> ',
        },
        {
          onCancel: () => {
            this.stop();
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
        await this.processInput(input);
      }
    }
  }

  /**
   * Process a command
   * @param input Command input string
   */
  private async processCommand(input: string): Promise<void> {
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

      case 'tools':
        const tools = toolRegistry.getAll();
        console.log(`Available tools (${tools.length}):\n`);
        tools.forEach(tool => {
          console.log(`- ${tool.name}: ${tool.description}`);
        });
        break;

      case 'tool':
        if (args.length === 0) {
          console.log('Usage: /tool <name> [args]');
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
   * Process user input and generate a response
   * @param input User input string
   */
  private async processInput(input: string): Promise<void> {
    if (!input.trim()) {
      return;
    }

    try {
      // Add user message to the conversation history
      this.messages.push({
        role: 'user',
        content: input,
      });

      console.log('\n[AI is thinking...]\n');

      let responseText = '';

      // Define callback for streaming updates
      const onUpdate: MessageCallback = (content, isDone) => {
        // Print the content character by character
        process.stdout.write(content);
        responseText += content;
      };

      try {
        // Query the AI with our messages
        await queryAI(this.messages, onUpdate);

        // Add the AI response to the conversation history
        this.messages.push({
          role: 'assistant',
          content: responseText,
        });
      } catch (error) {
        console.error('\n\nError communicating with AI:');
        if (error instanceof AIQueryError) {
          console.error(`Error: ${error.message}`);
          if (error.cause) {
            console.error(`Cause: ${error.cause.message}`);
          }
        } else {
          console.error(`Unexpected error: ${error}`);
        }

        // Add an error message to the conversation history
        this.messages.push({
          role: 'assistant',
          content:
            'Sorry, I encountered an error processing your request. Please try again.',
        });
      }

      console.log('\n'); // Add a newline after the response
    } catch (error) {
      console.error('Error processing input:', error);
    }
  }
}
