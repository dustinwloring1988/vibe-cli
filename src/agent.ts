import prompts from 'prompts';
import { queryAI, Message, Tool as AITool, QueryOptions } from './ai/query';
import { config } from './config';
import { toolRegistry, Tool, ToolError, suppressError } from './tools';
import { contextManager } from './context';
import { AgentPromptBuilder, AIPersonality, AIVerbosity } from './agent/index';

/**
 * Start the Agent REPL
 */
export async function startAgentRepl(): Promise<void> {
  try {
    // Initialize the context manager
    await contextManager.initialize();

    // Create and start the agent REPL
    const agent = new AgentRepl();
    await agent.start();
  } catch (error) {
    console.error('Error starting agent REPL:', error);
  }
}

/**
 * Agent REPL - A REPL that allows the AI to use tools autonomously
 */
export class AgentRepl {
  private isRunning: boolean = false;
  private exitRequested: boolean = false;
  private messages: Message[] = [];
  private availableTools: AITool[] = [];
  private debugMode: boolean = false;
  private promptBuilder: AgentPromptBuilder;

  constructor() {
    // Check if debug mode is enabled
    this.debugMode =
      process.argv.includes('--debug') || process.argv.includes('-d');

    // Create a prompt builder with configuration from command line or defaults
    this.promptBuilder = new AgentPromptBuilder({
      personality:
        (config.agent?.personality as AIPersonality) || AIPersonality.HELPFUL,
      verbosity: (config.agent?.verbosity as AIVerbosity) || AIVerbosity.MEDIUM,
      useMarkdown:
        config.agent?.useMarkdown !== undefined
          ? config.agent.useMarkdown
          : true,
      includeToolGuidelines: true,
    });

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
    // Define a JSONSchema structure for parameters
    type JSONSchemaObject = Record<string, unknown> & {
      type: string;
      properties: Record<string, unknown>;
      required: string[];
    };

    let parameters: JSONSchemaObject = {
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
      // Initialize the context manager
      await contextManager.initialize();

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
    // Use the prompt builder to generate the system message
    return this.promptBuilder.buildSystemMessage(toolRegistry.getAll());
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

    // Add user message to the conversation history
    this.messages.push({
      role: 'user',
      content: input,
    });

    console.log('\n[AI is thinking...]\n');

    // Use context manager to enhance messages with project context
    this.messages = contextManager.enhanceMessages(this.messages);

    // Try using the standard approach
    try {
      // Process the agent message with enhanced context
      await this.processAgentMessage(input);
    } catch (error) {
      console.error('Error processing input:', error);
    }

    console.log('\n'); // Add a newline after the response
  }

  /**
   * Process a message in agent mode
   * @param _input User message (not directly used in this method)
   */
  private async processAgentMessage(_input: string): Promise<void> {
    // responseText and other variables are managed in this method
    try {
      // The input is already added to messages and enhanced with context
      // Just use the existing method for getting AI response
      await this.getAIResponseWithToolCallsDirectly();
    } catch (error) {
      console.error('\n\nError in agent mode:', error);

      // Add an error message to the conversation history
      this.messages.push({
        role: 'assistant',
        content:
          'Sorry, I encountered an error processing your request. Please try again.',
      });
    }
  }

  /**
   * Process tool calls within the text
   * @param text The response text to analyze
   * @returns True if tool calls were processed, false otherwise
   */
  private async processToolCallsInText(text: string): Promise<boolean> {
    // Debug the full text to check what we're getting
    if (this.debugMode) {
      console.log('\n[Debug] Full response text:', text);
    }

    // Method 1: Look for ```json with tool_calls format
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      const codeContent = match[1].trim();

      if (this.debugMode) {
        console.log('\n[Debug] Code block content:', codeContent);
      }

      // Check for tool_calls format
      const toolCallsMatch = /tool_calls\s*:\s*\[\s*({[\s\S]*?})\s*\]/i.exec(
        codeContent
      );
      if (toolCallsMatch) {
        const toolCall = toolCallsMatch[1].trim();
        try {
          // Extract the name and params
          const nameMatch = /"name"\s*:\s*"([^"]+)"/.exec(toolCall);
          const paramsMatch = /"params"\s*:\s*({[\s\S]*?})(?:,|\s*$)/.exec(
            toolCall
          );

          if (nameMatch && paramsMatch) {
            const name = nameMatch[1];
            // Try to parse the params as JSON
            const paramsStr = paramsMatch[1].replace(/'/g, '"'); // Replace single quotes with double quotes
            try {
              const params = JSON.parse(paramsStr);
              await this.processToolCall(name, params);
              return true;
            } catch (_e) {
              if (this.debugMode) {
                console.log('\n[Debug] Error parsing params:', _e);
                console.log('Params string:', paramsStr);
              }

              // Try alternate parsing if JSON parse fails
              const pathMatch = /"path"\s*:\s*"([^"]+)"/.exec(paramsStr);
              if (pathMatch) {
                const path = pathMatch[1];
                await this.processToolCall(name, { path });
                return true;
              }
            }
          }
        } catch (e) {
          if (this.debugMode) {
            console.log(
              '\n[Debug] Error processing tool call from code block:',
              e
            );
          }
        }
      }
    }

    // Method 2: Direct JSON parsing of full content or parts
    try {
      if (
        text.includes('tool_calls') &&
        (text.includes('"name"') || text.includes('"params"'))
      ) {
        // Try to find a valid JSON object with tool_calls
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (
            line.includes('tool_calls') ||
            line.includes('"name"') ||
            line.includes('"params"')
          ) {
            // Try to find a JSON object starting from this line
            for (let j = 1; j <= 10; j++) {
              // Try various lengths
              const potentialJson = lines.slice(i, i + j).join('\n');
              try {
                // Try adding braces if they're missing
                const jsonToTry = potentialJson.startsWith('{')
                  ? potentialJson
                  : `{${potentialJson}}`;

                const parsed = JSON.parse(jsonToTry);

                if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
                  for (const call of parsed.tool_calls) {
                    if (call.name && call.params) {
                      await this.processToolCall(call.name, call.params);
                      return true;
                    }
                  }
                }
              } catch (_e) {
                // Silently continue trying
                suppressError(_e);
              }
            }
          }
        }
      }
    } catch (_e) {
      if (this.debugMode) {
        console.log('\n[Debug] Error parsing JSON from text:', _e);
      }
      suppressError(_e);
    }

    // Method 3: Simple regex-based tool call detection
    const toolCallRegex =
      /"name"\s*:\s*"([^"]+)"[\s\S]*?"params"\s*:\s*({[\s\S]*?})/g;
    let toolCallMatch;

    while ((toolCallMatch = toolCallRegex.exec(text)) !== null) {
      try {
        const name = toolCallMatch[1];
        const paramsText = toolCallMatch[2];

        // Try to parse the params as JSON
        try {
          const fixedParams = paramsText
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":');
          const params = JSON.parse(fixedParams);
          await this.processToolCall(name, params);
          return true;
        } catch (_e) {
          // If parsing fails, try to extract path directly
          suppressError(_e);
          const pathMatch = /"path"\s*:\s*"?([^",}]+)"?/.exec(paramsText);
          if (pathMatch) {
            await this.processToolCall(name, { path: pathMatch[1] });
            return true;
          }
        }
      } catch (e) {
        if (this.debugMode) {
          console.log('\n[Debug] Error processing regex-based tool call:', e);
        }
      }
    }

    return false;
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
        content: `Use the appropriate tool to answer this question: "${
          this.messages[this.messages.length - 1].content
        }"`,
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

          // Only process and display when fully done
          if (isDone && responseText) {
            try {
              if (this.debugMode) {
                console.log('\n[Debug] Full fallback response:', responseText);
              }

              // Try various parsing strategies
              this.processToolCallsInText(responseText).catch(_e => {
                console.error('Error processing fallback tool call:', _e);
                // If we can't parse tool calls, just display the text
                console.log(responseText);
              });
            } catch (_e) {
              // Not JSON, so print directly
              console.log(responseText);
              suppressError(_e);
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
    parameters: Record<string, unknown>
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
          // Instead of writing to stdout directly, accumulate the response
          // and only print it when done to avoid jumbled text
          followUpResponse += content;

          if (isDone) {
            console.log(followUpResponse);
          }
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
        content: `Tool Error:\n\n${
          error instanceof ToolError ? error.message : String(error)
        }`,
      });

      // Get AI's error response
      console.log('\n[AI is processing the error...]\n');

      let errorResponse = '';
      await queryAI(
        this.messages,
        (content, _isDone) => {
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
