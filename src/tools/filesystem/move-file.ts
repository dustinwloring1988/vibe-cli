import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments for the MoveFile tool
 */
export interface MoveFileArgs extends ToolArgs {
  /**
   * The source file or directory path
   */
  source: string;

  /**
   * The destination file or directory path
   */
  destination: string;

  /**
   * Whether to overwrite the destination if it exists
   * Default: false
   */
  overwrite?: boolean;
}

/**
 * Result of a MoveFile operation
 */
export interface MoveFileResult {
  /**
   * The absolute path of the source
   */
  source: string;

  /**
   * The absolute path of the destination
   */
  destination: string;
}

/**
 * Tool for moving files and directories
 */
export class MoveFileTool extends BaseTool<MoveFileArgs, MoveFileResult> {
  name = 'moveFile';
  description = 'Moves or renames a file or directory with collision detection';

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(args: MoveFileArgs): Promise<ToolResult<MoveFileResult>> {
    try {
      if (!args.source) {
        return this.failure('Source path is required');
      }
      if (!args.destination) {
        return this.failure('Destination path is required');
      }

      // Resolve the paths
      const sourcePath = path.resolve(args.source);
      const destinationPath = path.resolve(args.destination);

      // Check if source exists
      try {
        await fs.stat(sourcePath);
      } catch (_error) {
        suppressError(_error);
        return this.failure(`Source not found: ${sourcePath}`);
      }

      // Check if destination exists
      try {
        await fs.stat(destinationPath);

        // If destination exists and overwrite is not enabled, return an error
        if (!args.overwrite) {
          return this.failure(
            `Destination already exists: ${destinationPath}. Use overwrite: true to replace it.`
          );
        }
      } catch (_error) {
        // Destination doesn't exist, which is expected
        suppressError(_error);
      }

      // Ensure the destination directory exists
      const destinationDir = path.dirname(destinationPath);
      try {
        await fs.mkdir(destinationDir, { recursive: true });
      } catch (error) {
        suppressError(error);
        // Ignore error if directory already exists
      }

      // Move the file
      await fs.rename(sourcePath, destinationPath);

      // Return the result
      return this.success({
        source: sourcePath,
        destination: destinationPath,
      });
    } catch (error) {
      return this.failure(`Error moving file: ${(error as Error).message}`);
    }
  }
}
