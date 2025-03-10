import fs from 'fs/promises';
import path from 'path';
import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';

/**
 * Arguments for the LoadInstructionsTool
 */
export interface LoadInstructionsArgs extends ToolArgs {
  /**
   * Path to the VIBE.md file (optional, defaults to project root)
   */
  path?: string;
}

/**
 * Result of the LoadInstructionsTool
 */
export interface LoadInstructionsResult {
  /**
   * Path to the instructions file
   */
  path: string;

  /**
   * Content of the instructions file
   */
  content: string;

  /**
   * Whether the file was found and loaded successfully
   */
  found: boolean;
}

/**
 * Tool for loading project instructions from VIBE.md file
 */
export class LoadInstructionsTool extends BaseTool<
  LoadInstructionsArgs,
  LoadInstructionsResult
> {
  name = 'loadInstructions';
  description = 'Loads project instructions from VIBE.md file';

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(
    args: LoadInstructionsArgs
  ): Promise<ToolResult<LoadInstructionsResult>> {
    try {
      // Default path is VIBE.md in current directory
      const instructionsFilePath = path.resolve(args.path || 'VIBE.md');

      // Check if file exists
      try {
        const stats = await fs.stat(instructionsFilePath);
        if (!stats.isFile()) {
          return this.success({
            path: instructionsFilePath,
            content: '',
            found: false,
          });
        }
      } catch (_error) {
        // File not found
        suppressError(_error);
        return this.success({
          path: instructionsFilePath,
          content: '',
          found: false,
        });
      }

      // Read the file
      const content = await fs.readFile(instructionsFilePath, 'utf8');

      // Return the result
      return this.success({
        path: instructionsFilePath,
        content,
        found: true,
      });
    } catch (_error) {
      suppressError(_error);
      return this.failure(
        `Error loading instructions: ${(_error as Error).message}`
      );
    }
  }
}
