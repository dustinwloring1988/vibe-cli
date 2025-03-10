import { Message } from './ai/query';
import { toolRegistry } from './tools';
import path from 'path';
import fs from 'fs/promises';
import { suppressError } from './tools/interface';

/**
 * Context manager for handling project context and instructions
 */
export class ContextManager {
  private projectInstructions: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the context manager
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.loadProjectInstructions();
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing context manager:', error);
    }
  }

  /**
   * Load project instructions from VIBE.md file
   */
  private async loadProjectInstructions(): Promise<void> {
    try {
      if (toolRegistry.has('loadInstructions')) {
        const result = await toolRegistry.execute<{
          content: string;
          found: boolean;
        }>('loadInstructions', {});

        if (result.found && result.content) {
          this.projectInstructions = result.content;
          console.log('Project instructions loaded successfully');
        } else {
          console.log('No project instructions (VIBE.md) found');
          this.projectInstructions = null;
        }
      } else {
        // Fallback to direct file access if tool is not available
        try {
          const vibeMdPath = path.resolve('VIBE.md');
          const content = await fs.readFile(vibeMdPath, 'utf8');
          this.projectInstructions = content;
          console.log('Project instructions loaded successfully (direct)');
        } catch (_error) {
          console.log('No project instructions (VIBE.md) found (direct)');
          this.projectInstructions = null;
          suppressError(_error);
        }
      }
    } catch (error) {
      console.error('Error loading project instructions:', error);
      this.projectInstructions = null;
    }
  }

  /**
   * Get the project instructions
   * @returns The project instructions, or null if not available
   */
  public getProjectInstructions(): string | null {
    return this.projectInstructions;
  }

  /**
   * Enhance messages with project context
   * @param messages The base messages
   * @returns Enhanced messages with project context
   */
  public enhanceMessages(messages: Message[]): Message[] {
    if (!this.isInitialized) {
      console.warn('Context manager not initialized');
      return messages;
    }

    // Clone the messages to avoid modifying the original
    const enhancedMessages = [...messages];

    // Find the system message (if any)
    const systemMessageIndex = enhancedMessages.findIndex(
      message => message.role === 'system'
    );

    // If we have project instructions, add them to the system message or create one
    if (this.projectInstructions) {
      const projectContext = `
=== PROJECT INSTRUCTIONS ===
The following are project-specific instructions (from VIBE.md):

${this.projectInstructions}
=== END PROJECT INSTRUCTIONS ===

Please consider these instructions when responding to queries.
`;

      if (systemMessageIndex !== -1) {
        // Add to existing system message
        enhancedMessages[systemMessageIndex].content += '\n\n' + projectContext;
      } else {
        // Create a new system message
        enhancedMessages.unshift({
          role: 'system',
          content: projectContext,
        });
      }
    }

    return enhancedMessages;
  }
}

/**
 * Global context manager instance
 */
export const contextManager = new ContextManager();
