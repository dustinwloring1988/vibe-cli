import prompts from 'prompts';
import {
  queryAI,
  Message,
  MessageCallback,
  AIQueryError,
  Tool as AITool,
  QueryOptions,
} from './ai/query';
import { config } from './config';
import { toolRegistry, Tool, ToolError } from './tools';

/**
 * Agent REPL - A REPL that allows the AI to use tools autonomously
 */
export class AgentRepl {
  private isRunning: boolean = false;
  private exitRequested: boolean = false;
  private messages: Message[] = [];
  private availableTools: AITool[] = [];
  private debugMode: boolean = false;

  constructor() {
    // Check if debug mode is enabled
    this.debugMode =
      process.argv.includes('--debug') || process.argv.includes('-d');

    // Initialize available tools
    this.initializeAvailableTools();

    // Initialize with a system message that explains available tools to the AI
    this.messages.push({
      role: 'system',
      content: this.buildSystemMessage(),
    });
  }

  /**
   * Initialize the available tools with proper schema definitions
   */
  private initializeAvailableTools(): void {
    const tools = toolRegistry.getAll();

    // Convert our tools to the format expected by the AI
    this.availableTools = tools.map(tool => this.convertToAITool(tool));
  }

  /**
   * Convert our tool to the format expected by the AI
   */
  private convertToAITool(tool: Tool): AITool {
    let parameters: Record<string, any> = {
      type: 'object',
      properties: {},
      required: [],
    };

    // For listDir tool
    if (tool.name === 'listDir') {
      parameters.properties = {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      };
      parameters.required = ['path'];
    }
    // For readFile tool
    else if (tool.name === 'readFile') {
      parameters.properties = {
        path: {
          type: 'string',
          description: 'The file path to read',
        },
        encoding: {
          type: 'string',
          description: 'The encoding to use (defaults to utf8)',
          enum: [
            'utf8',
            'ascii',
            'utf16le',
            'ucs2',
            'base64',
            'latin1',
            'binary',
            'hex',
          ],
          default: 'utf8',
        },
      };
      parameters.required = ['path'];
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: parameters,
    };
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
    console.log('  /debug   - Toggle debug mode');
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
    message +=
      'When a user asks for information that requires accessing the filesystem, you MUST use the appropriate tool instead of making up a response.\n\n';
    message += 'AVAILABLE TOOLS:\n\n';

    tools.forEach(tool => {
      message += `Tool: ${tool.name}\n`;
      message += `Description: ${tool.description}\n`;

      if (tool.name === 'listDir') {
        message += 'Parameters: { "path": "directory_path_to_list" }\n';
      } else if (tool.name === 'readFile') {
        message +=
          'Parameters: { "path": "file_path_to_read", "encoding": "utf8" }\n';
      }

      message += '\n';
    });

    message += 'IMPORTANT RULES:\n';
    message += '1. ALWAYS use tools when asked about files or directories.\n';
    message += '2. Never make up file contents or directory listings.\n';
    message += '3. If you need to list files, use the listDir tool.\n';
    message += '4. If you need to read a file, use the readFile tool.\n';
    message += '5. Use tools without asking for permission from the user.\n';
    message +=
      '6. DO NOT mention tools explicitly in your conversation - just use them transparently.\n';
    message +=
      '7. When using tools, format your API response using JSON tool_calls.\n';

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

      case 'debug':
        this.debugMode = !this.debugMode;
        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}.`);
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

      // Try using the standard approach first
      await this.getAIResponse();

      console.log('\n'); // Add a newline after the response
    } catch (error) {
      console.error('Error processing input:', error);
    }
  }

  /**
   * Get AI response with potential tool calls
   */
  private async getAIResponse(): Promise<void> {
    let responseText = '';
    let responseFailed = false;

    try {
      // Define callback for streaming updates
      const onUpdate: MessageCallback = (content, isDone) => {
        responseText += content;
        process.stdout.write(content);

        // Check for tool calls in the response
        if (isDone && responseText) {
          try {
            // See if the response contains tool calls marker
            if (
              responseText.includes('```json') &&
              responseText.includes('tool_calls')
            ) {
              // This will be handled later in processToolCallsInText
            }
          } catch (e) {
            // Not a tool call, proceed with normal response
            if (this.debugMode) {
              console.log('\n[Debug] Not a valid tool call JSON:', e);
            }
          }
        }
      };

      // Define query options - don't use JSON format mode initially
      // This allows more natural responses when tools aren't needed
      const queryOptions: QueryOptions = {
        temperature: 0.2, // Lower temperature for more predictable outputs
        debugMode: this.debugMode,
      };

      // Query the AI with our messages
      await queryAI(this.messages, onUpdate, queryOptions);

      // Check for tool calls in text format (code blocks)
      const toolCallsDetected = await this.processToolCallsInText(responseText);

      if (!toolCallsDetected) {
        // No tool calls were detected, add the response to history
        this.messages.push({
          role: 'assistant',
          content: responseText,
        });
      }
    } catch (error) {
      responseFailed = true;
      console.error('\n\nError communicating with AI:');
      if (error instanceof AIQueryError) {
        console.error(`Error: ${error.message}`);
        if (error.cause) {
          console.error(`Cause: ${error.cause.message}`);
        }
      } else {
        console.error(`Unexpected error: ${error}`);
      }

      // Try the fallback approach if the first attempt failed
      if (responseFailed) {
        try {
          await this.getAIResponseWithToolCallsDirectly();
        } catch (fallbackError) {
          console.error('\nFallback approach also failed:', fallbackError);

          // Add an error message to the conversation history
          this.messages.push({
            role: 'assistant',
            content:
              'Sorry, I encountered an error processing your request. Please try again.',
          });
        }
      }
    }
  }

  /**
   * Process tool calls within code blocks in text
   * @param text The response text to analyze
   * @returns True if tool calls were processed, false otherwise
   */
  private async processToolCallsInText(text: string): Promise<boolean> {
    // Look for code blocks that might contain tool calls
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let match;
    let toolCallsProcessed = false;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const codeContent = match[1];
      try {
        // Try to parse the content as JSON
        const parsedContent = JSON.parse(codeContent);

        // Check if it's a tool call
        if (
          parsedContent.tool_calls &&
          Array.isArray(parsedContent.tool_calls)
        ) {
          for (const toolCall of parsedContent.tool_calls) {
            if (toolCall.name && toolCall.parameters) {
              // Process this tool call
              await this.processToolCall(toolCall.name, toolCall.parameters);
              toolCallsProcessed = true;
            }
          }
        }
      } catch (e) {
        // Not valid JSON or not a tool call
        if (this.debugMode) {
          console.log('\n[Debug] Not a valid tool call in code block:', e);
        }
      }
    }

    return toolCallsProcessed;
  }

  /**
   * Fallback method: Try a more direct approach to get tool calls
   */
  private async getAIResponseWithToolCallsDirectly(): Promise<void> {
    try {
      console.log('\n[Trying a more structured approach...]\n');

      // Define query options with JSON format specifically for tool calling
      const queryOptions: QueryOptions = {
        format: 'json',
        tools: this.availableTools,
        toolChoice: 'auto',
        temperature: 0.1, // Even lower temperature for more direct tool calling
        debugMode: this.debugMode,
      };

      // Create a simplified message to focus on the tool calling
      const toolMessage: Message = {
        role: 'user',
        content: `Use the appropriate tool to answer this question: "${this.messages[this.messages.length - 1].content}"`,
      };

      // Create a new message array with the system message and the tool message
      const toolMessages = [
        this.messages[0], // System message
        toolMessage,
      ];

      // Define callback that specifically looks for tool calls
      let responseText = '';
      await queryAI(
        toolMessages,
        (content, isDone) => {
          responseText += content;

          // Don't print the JSON directly
          if (isDone && responseText) {
            try {
              const parsedResponse = JSON.parse(responseText);
              if (
                parsedResponse.tool_calls &&
                parsedResponse.tool_calls.length > 0
              ) {
                // Process each tool call
                for (const toolCall of parsedResponse.tool_calls) {
                  this.processToolCall(
                    toolCall.name,
                    toolCall.parameters
                  ).catch(e => {
                    console.error('Error processing tool call:', e);
                  });
                }
              } else {
                // No tool calls found, so print the response
                console.log(responseText);
              }
            } catch (e) {
              // Not JSON, so print directly
              console.log(responseText);
            }
          }
        },
        queryOptions
      );
    } catch (error) {
      console.error('Error in fallback tool calling:', error);
    }
  }

  /**
   * Process a tool call
   * @param toolName The name of the tool to call
   * @param parameters The parameters for the tool call
   */
  private async processToolCall(
    toolName: string,
    parameters: any
  ): Promise<void> {
    try {
      if (!toolName || !toolRegistry.has(toolName)) {
        console.log(`\n[Tool "${toolName}" not found or invalid]`);
        return;
      }

      console.log(`\n[Executing tool: ${toolName}]`);
      console.log(`Arguments: ${JSON.stringify(parameters, null, 2)}`);

      // Execute the tool
      const result = await toolRegistry.execute(toolName, parameters);

      console.log(`\n[Tool Result]:`);
      console.log(JSON.stringify(result, null, 2));

      // Create a condensed view of the result for large outputs
      let resultContent = JSON.stringify(result);
      if (resultContent.length > 500) {
        resultContent = resultContent.substring(0, 490) + '... (truncated)';
      }

      // Add the AI response that used the tool
      this.messages.push({
        role: 'assistant',
        content: `I'll check that for you using the ${toolName} tool.`,
      });

      // Add tool result to conversation history
      this.messages.push({
        role: 'user',
        content: `Tool Result (${toolName}):\n\n${resultContent}`,
      });

      // Get AI's follow-up response
      console.log('\n[AI is processing the tool result...]\n');

      let followUpResponse = '';
      await queryAI(
        this.messages,
        (content, isDone) => {
          process.stdout.write(content);
          followUpResponse += content;
        },
        { debugMode: this.debugMode }
      );

      // Add follow-up response to conversation history
      this.messages.push({
        role: 'assistant',
        content: followUpResponse,
      });
    } catch (error) {
      console.error(`\n[Error executing tool]:`);
      if (error instanceof ToolError) {
        console.error(error.message);
      } else {
        console.error(error);
      }

      // Add error message to conversation history
      this.messages.push({
        role: 'user',
        content: `Tool Error:\n\n${error instanceof ToolError ? error.message : String(error)}`,
      });

      // Get AI's error response
      console.log('\n[AI is processing the error...]\n');

      let errorResponse = '';
      await queryAI(
        this.messages,
        (content, isDone) => {
          process.stdout.write(content);
          errorResponse += content;
        },
        { debugMode: this.debugMode }
      );

      // Add error response to conversation history
      this.messages.push({
        role: 'assistant',
        content: errorResponse,
      });
    }
  }
}
