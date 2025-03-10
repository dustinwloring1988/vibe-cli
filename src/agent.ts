import prompts from 'prompts';
import { queryAI, Message, MessageCallback, AIQueryError } from './ai/query';
import { config } from './config';
import { toolRegistry, Tool, ToolError } from './tools';

/**
 * Interface for a tool call in the AI response
 */
interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Agent REPL - A REPL that allows the AI to use tools autonomously
 */
export class AgentRepl {
  private isRunning: boolean = false;
  private exitRequested: boolean = false;
  private messages: Message[] = [];

  constructor() {
    // Initialize with a system message that explains available tools to the AI
    this.messages.push({
      role: 'system',
      content: this.buildSystemMessage(),
    });
  }

  /**
   * Start the Agent REPL session
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Agent REPL is already running');
      return;
    }

    this.isRunning = true;
    this.exitRequested = false;

    console.log(
      'Welcome to Vibe CLI Agent! Type "exit" or press Ctrl+C to exit.\n'
    );
    console.log(
      `Using model: ${config.ollama.model} at ${config.ollama.apiUrl}\n`
    );
    console.log('The AI agent can use the following tools:');

    toolRegistry.getAll().forEach(tool => {
      console.log(`- ${tool.name}: ${tool.description}`);
    });

    console.log('\nAvailable commands:');
    console.log('  /clear   - Clear the conversation history');
    console.log('  /exit    - Exit the REPL\n');

    try {
      await this.loop();
    } catch (error) {
      console.error('Error in Agent REPL session:', error);
    } finally {
      this.isRunning = false;
      console.log('\nExiting Vibe CLI Agent. Goodbye!');
    }
  }

  /**
   * Stop the Agent REPL session
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.exitRequested = true;
  }

  /**
   * Build a system message that explains available tools to the AI
   */
  private buildSystemMessage(): string {
    const tools = toolRegistry.getAll();

    let message =
      'You are an AI assistant with access to tools to help users with coding tasks.\n\n';
    message += 'AVAILABLE TOOLS:\n\n';

    tools.forEach(tool => {
      message += `Tool: ${tool.name}\n`;
      message += `Description: ${tool.description}\n\n`;
    });

    message += 'TOOL CALLING INSTRUCTIONS:\n\n';
    message +=
      'To use a tool, format your response using triple backticks and the keyword "tool" followed by the tool configuration in YAML format:\n\n';
    message += '```tool\n';
    message += 'name: toolName\n';
    message += 'args:\n';
    message += '  arg1: value1\n';
    message += '  arg2: value2\n';
    message += '```\n\n';

    message += 'Example calling the listDir tool:\n\n';
    message += '```tool\n';
    message += 'name: listDir\n';
    message += 'args:\n';
    message += '  path: .\n';
    message += '```\n\n';

    message += 'Example calling the readFile tool:\n\n';
    message += '```tool\n';
    message += 'name: readFile\n';
    message += 'args:\n';
    message += '  path: ./README.md\n';
    message += '  encoding: utf8\n';
    message += '```\n\n';

    message += 'IMPORTANT RULES:\n';
    message += '1. Only use available tools as listed above.\n';
    message += '2. Format your tool calls exactly as shown in the examples.\n';
    message +=
      '3. Continue your conversation after the tool call result is provided.\n';
    message += '4. Only make ONE tool call at a time.\n';
    message +=
      '5. If you need to use multiple tools, wait for each result before making the next call.\n';
    message +=
      '6. Do not make up tools that are not in the available tools list.\n';
    message +=
      '7. Your response should start with a brief reply to the user, then the tool call if needed, then continue the conversation after the tool result.\n';

    return message;
  }

  /**
   * Main Agent REPL loop
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
    const parts = input.trim().split(/\s+/);
    const command = parts[0].substring(1).toLowerCase();

    switch (command) {
      case 'exit':
        this.stop();
        break;

      case 'clear':
        // Reset messages but keep the system message
        const systemMessage = this.messages[0];
        this.messages = [systemMessage];
        console.log('Conversation history cleared.');
        break;

      default:
        console.log(`Unknown command: ${command}`);
        break;
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

      // Process AI response with potential tool calls
      await this.getAIResponseWithToolCalls();

      console.log('\n'); // Add a newline after the response
    } catch (error) {
      console.error('Error processing input:', error);
    }
  }

  /**
   * Get AI response and process any tool calls
   */
  private async getAIResponseWithToolCalls(): Promise<void> {
    let responseText = '';
    let toolCallDetected = false;
    let toolCallBuffer = '';
    let inToolCall = false;

    try {
      // Define callback for streaming updates
      const onUpdate: MessageCallback = (content, isDone) => {
        responseText += content;

        // Check for tool call markers
        if (content.includes('```tool')) {
          inToolCall = true;
          toolCallDetected = true;
        } else if (inToolCall && content.includes('```')) {
          inToolCall = false;
        }

        if (inToolCall) {
          toolCallBuffer += content;
          // Don't print content when collecting tool call
          // Instead, buffer it for later processing
        } else {
          // Print the content character by character
          process.stdout.write(content);
        }
      };

      // Query the AI with our messages
      await queryAI(this.messages, onUpdate);

      // Process any tool calls in the response
      if (toolCallDetected) {
        await this.processToolCalls(responseText);
      } else {
        // Add the AI response to the conversation history
        this.messages.push({
          role: 'assistant',
          content: responseText,
        });
      }
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
  }

  /**
   * Process tool calls in the AI response
   * @param responseText The AI response text
   */
  private async processToolCalls(responseText: string): Promise<void> {
    // Extract all tool calls from the response
    const toolCalls = this.extractToolCalls(responseText);

    if (toolCalls.length === 0) {
      console.log('\n[No valid tool calls found in response]');

      // Add the AI response to the conversation history as is
      this.messages.push({
        role: 'assistant',
        content: responseText,
      });

      return;
    }

    // Replace tool call blocks with placeholders in the response
    let cleanedResponse = responseText;
    const toolCallRegex = /```tool[\s\S]*?```/g;
    cleanedResponse = cleanedResponse.replace(toolCallRegex, '[Tool Call]');

    // Add the cleaned response to the conversation history
    this.messages.push({
      role: 'assistant',
      content: cleanedResponse,
    });

    // Process each tool call
    for (const toolCall of toolCalls) {
      try {
        console.log(`\n[Executing tool: ${toolCall.name}]`);
        console.log(
          `Arguments: ${JSON.stringify(toolCall.arguments, null, 2)}`
        );

        // Execute the tool
        const result = await toolRegistry.execute(
          toolCall.name,
          toolCall.arguments
        );

        console.log(`\n[Tool Result]:`);
        console.log(JSON.stringify(result, null, 2));

        // Add tool result to conversation history
        this.messages.push({
          role: 'user',
          content: `Tool Result (${toolCall.name}):\n\n${JSON.stringify(result, null, 2)}`,
        });

        // Get AI's follow-up response
        console.log('\n[AI is processing the tool result...]\n');

        let followUpResponse = '';
        await queryAI(this.messages, (content, isDone) => {
          process.stdout.write(content);
          followUpResponse += content;
        });

        // Add follow-up response to conversation history
        this.messages.push({
          role: 'assistant',
          content: followUpResponse,
        });
      } catch (error) {
        console.error(`\n[Error executing tool ${toolCall.name}]:`);
        if (error instanceof ToolError) {
          console.error(error.message);
        } else {
          console.error(error);
        }

        // Add error message to conversation history
        this.messages.push({
          role: 'user',
          content: `Tool Error (${toolCall.name}):\n\n${error instanceof ToolError ? error.message : String(error)}`,
        });

        // Get AI's error response
        console.log('\n[AI is processing the error...]\n');

        let errorResponse = '';
        await queryAI(this.messages, (content, isDone) => {
          process.stdout.write(content);
          errorResponse += content;
        });

        // Add error response to conversation history
        this.messages.push({
          role: 'assistant',
          content: errorResponse,
        });
      }
    }
  }

  /**
   * Extract tool calls from AI response
   * @param text The response text
   * @returns Array of tool calls
   */
  private extractToolCalls(text: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const toolCallRegex = /```tool\n([\s\S]*?)```/g;

    let match: RegExpExecArray | null;
    while ((match = toolCallRegex.exec(text)) !== null) {
      try {
        const toolCallContent = match[1];

        // Parse the tool call content
        let name = '';
        const args: Record<string, unknown> = {};

        const nameMatch = /name\s*:\s*(\w+)/i.exec(toolCallContent);
        if (nameMatch) {
          name = nameMatch[1];
        }

        const argsMatch = /args\s*:\s*\n([\s\S]*?)(?:\n\w+:|$)/i.exec(
          toolCallContent
        );
        if (argsMatch) {
          const argsContent = argsMatch[1];
          const argLines = argsContent.trim().split('\n');

          for (const line of argLines) {
            const argMatch = /^\s*(\w+)\s*:\s*(.+)$/.exec(line);
            if (argMatch) {
              const [_, argName, argValue] = argMatch;
              args[argName] = argValue.trim();
            }
          }
        }

        if (name && toolRegistry.has(name)) {
          toolCalls.push({ name, arguments: args });
        } else if (name) {
          console.warn(`Tool "${name}" not found in registry`);
        } else {
          console.warn(`No tool name found in tool call block`);
        }
      } catch (error) {
        console.error('Error parsing tool call:', error);
      }
    }

    return toolCalls;
  }
}
