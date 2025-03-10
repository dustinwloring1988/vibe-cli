import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments for the ListDir tool
 */
export interface ListDirArgs extends ToolArgs {
  /**
   * The directory path to list
   */
  path: string;
}

/**
 * Result of a ListDir operation
 */
export interface ListDirResult {
  /**
   * The absolute path of the directory
   */
  path: string;

  /**
   * List of files in the directory
   */
  files: string[];

  /**
   * List of directories in the directory
   */
  directories: string[];
}

/**
 * Tool for listing files and directories in a directory
 */
export class ListDirTool extends BaseTool<ListDirArgs, ListDirResult> {
  name = 'listDir';
  description = 'Lists files and directories in a directory';

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(args: ListDirArgs): Promise<ToolResult<ListDirResult>> {
    try {
      if (!args.path) {
        return this.failure('Path is required');
      }

      // Resolve the directory path
      const dirPath = path.resolve(args.path);

      // Check if the directory exists
      try {
        const stats = await fs.stat(dirPath);
        if (!stats.isDirectory()) {
          return this.failure(`Path ${dirPath} is not a directory`);
        }
      } catch (_error) {
        return this.failure(`Directory not found: ${dirPath}`);
        suppressError(_error);
      }

      // Read the directory contents
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Separate files and directories
      const files: string[] = [];
      const directories: string[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          directories.push(entry.name);
        } else if (entry.isFile()) {
          files.push(entry.name);
        }
      }

      // Return the result
      return this.success({
        path: dirPath,
        files,
        directories,
      });
    } catch (_error) {
      return this.failure(
        `Error listing directory: ${(_error as Error).message}`
      );
      suppressError(_error);
    }
  }
}
