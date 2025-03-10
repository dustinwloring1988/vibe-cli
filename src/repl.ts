import prompts from 'prompts';
import { queryAI, Message, MessageCallback, AIQueryError } from './ai/query';
import { config } from './config';

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

      await this.processInput(input);
    }
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
