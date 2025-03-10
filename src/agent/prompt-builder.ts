import { Tool } from '../tools';
import {
  AgentPromptConfig,
  defaultAgentPromptConfig,
  getFormattingGuidelines,
  getPersonalityDescription,
  getVerbosityGuidelines,
} from './prompt-config';

/**
 * Builder for creating the agent system prompt
 */
export class AgentPromptBuilder {
  private config: AgentPromptConfig;

  /**
   * Create a new prompt builder with the specified configuration
   * @param config Configuration for the prompt builder
   */
  constructor(config: Partial<AgentPromptConfig> = {}) {
    this.config = {
      ...defaultAgentPromptConfig,
      ...config,
    };
  }

  /**
   * Build a system message for the agent based on the current configuration
   * @param tools Available tools for the agent
   * @returns A string containing the full system message
   */
  buildSystemMessage(tools: Tool[]): string {
    let message = '';

    // Add the personality description
    message += `${getPersonalityDescription(this.config.personality)}\n\n`;

    // Add verbosity guidelines
    message += `${getVerbosityGuidelines(this.config.verbosity)}\n\n`;

    // Add formatting guidelines
    message += `${getFormattingGuidelines(this.config.useMarkdown)}\n\n`;

    // Add information about coding tasks focus
    message += this.buildCodingTasksSection();

    // Add tools information
    message += this.buildToolsSection(tools);

    // Add tool usage guidelines if specified
    if (this.config.includeToolGuidelines) {
      message += this.buildToolGuidelinesSection();
    }

    // Add additional custom instructions if provided
    if (this.config.customInstructions) {
      message += `\n\nADDITIONAL INSTRUCTIONS:\n${this.config.customInstructions}\n\n`;
    }

    return message;
  }

  /**
   * Build the section of the prompt that focuses on coding tasks
   * @returns A string containing the coding tasks section
   */
  private buildCodingTasksSection(): string {
    let section = 'CODING CAPABILITIES:\n';
    section += '- You analyze, explain, and improve code\n';
    section += '- You can debug issues and suggest fixes\n';
    section += '- You help with software architecture and design patterns\n';
    section += '- You assist with refactoring and code optimization\n';
    section += '- You provide best practices and code standards guidance\n';
    section += '- You help with testing strategies and implementation\n\n';

    section += 'LANGUAGE EXPERTISE:\n';
    section +=
      '- You are skilled in various programming languages including JavaScript, TypeScript, Python, Java, C#, Go, Rust, and others\n';
    section +=
      '- You understand frameworks like React, Angular, Vue, Express, Django, Flask, Spring, and more\n';
    section +=
      '- You can provide language-specific best practices and idioms\n\n';

    return section;
  }

  /**
   * Build the section of the prompt that explains available tools
   * @param tools Available tools for the agent
   * @returns A string containing the tools section
   */
  private buildToolsSection(tools: Tool[]): string {
    let section = 'AVAILABLE TOOLS:\n\n';

    tools.forEach(tool => {
      section += `Tool: ${tool.name}\n`;
      section += `Description: ${tool.description}\n\n`;
    });

    return section;
  }

  /**
   * Build the section of the prompt that provides tool usage guidelines
   * @returns A string containing the tool guidelines section
   */
  private buildToolGuidelinesSection(): string {
    let section = 'TOOL USAGE GUIDELINES:\n';
    section += '1. ALWAYS use tools when asked about files or directories.\n';
    section += '2. Never make up file contents or directory listings.\n';
    section += '3. Use appropriate tools for filesystem operations:\n';
    section += '   - Use listDir to list directory contents\n';
    section += '   - Use readFile to view file contents\n';
    section += '   - Use writeFile to modify existing files\n';
    section += '   - Use createFile to create new files\n';
    section += '   - Use deleteFile to remove files\n';
    section += '   - Use mkdir to create directories\n';
    section += '   - Use moveFile to move or rename files and directories\n';
    section += '4. Use tools without asking for permission from the user.\n';
    section +=
      '5. DO NOT mention tools explicitly in your conversation - just use them transparently.\n';
    section +=
      '6. When using tools, respond with a JSON object using the format:\n';
    section += '```json\n';
    section += 'tool_calls: [\n';
    section += '  {\n';
    section += '    "name": "toolName",\n';
    section += '    "params": { "param1": "value1", "param2": "value2" }\n';
    section += '  }\n';
    section += ']\n';
    section += '```\n\n';

    section += 'TOOL CHAIN PATTERNS:\n';
    section += '1. File Exploration: listDir → readFile\n';
    section += '2. Code Modification: readFile → writeFile\n';
    section += '3. File Creation: mkdir (if needed) → createFile\n';
    section += '4. File Organization: listDir → moveFile\n\n';

    return section;
  }
}
