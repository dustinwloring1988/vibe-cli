import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments for the MakeDir tool
 */
export interface MakeDirArgs extends ToolArgs {
  /**
   * The directory path to create
   */
  path: string;

  /**
   * Whether to create parent directories if they don't exist
   * Default: true
   */
  recursive?: boolean;
}

/**
 * Result of a MakeDir operation
 */
export interface MakeDirResult {
  /**
   * The absolute path of the created directory
   */
  path: string;
}

/**
 * Tool for creating directories
 */
export class MakeDirTool extends BaseTool<MakeDirArgs, MakeDirResult> {
  name = 'mkdir';
  description = 'Creates a directory with optional recursive creation';

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(args: MakeDirArgs): Promise<ToolResult<MakeDirResult>> {
    try {
      if (!args.path) {
        return this.failure('Path is required');
      }

      // Resolve the directory path
      const dirPath = path.resolve(args.path);

      // Set recursive option (default to true)
      const recursive = args.recursive !== false;

      try {
        // Check if directory already exists
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          return this.success({ path: dirPath });
        }
        return this.failure(`Path ${dirPath} exists but is not a directory`);
      } catch (error) {
        // Directory doesn't exist, which is expected
        suppressError(error);
      }

      // Create the directory
      await fs.mkdir(dirPath, { recursive });

      // Return the result
      return this.success({
        path: dirPath,
      });
    } catch (error) {
      return this.failure(
        `Error creating directory: ${(error as Error).message}`
      );
    }
  }
}
