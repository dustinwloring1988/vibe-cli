import { BaseTool, ToolArgs, ToolResult } from '../interface';
import fs from 'fs/promises';
import path from 'path';
import prompts from 'prompts';

/**
 * Arguments for the WriteFile tool
 */
export interface WriteFileArgs extends ToolArgs {
  /**
   * The file path to write to
   */
  path: string;

  /**
   * The content to write to the file
   */
  content: string;

  /**
   * The encoding to use (defaults to 'utf8')
   */
  encoding?: BufferEncoding;

  /**
   * Whether to force overwriting existing files without confirmation
   */
  force?: boolean;
}

/**
 * Result of a WriteFile operation
 */
export interface WriteFileResult {
  /**
   * The absolute path of the file that was written
   */
  path: string;

  /**
   * Whether the file was overwritten
   */
  overwritten: boolean;

  /**
   * The number of bytes written
   */
  bytesWritten: number;
}

/**
 * Tool for writing content to files
 */
export class WriteFileTool extends BaseTool<WriteFileArgs, WriteFileResult> {
  name = 'writeFile';
  description = 'Writes content to a file with overwrite confirmation';

  // List of forbidden file extensions for security
  private forbiddenExtensions = [
    '.env',
    '.pem',
    '.key',
    '.crt',
    '.p12',
    '.pfx',
    '.passwd',
    '.password',
    '.secret',
    '.credentials',
  ];

  // List of forbidden directories for security
  private forbiddenDirs = [
    '/etc',
    '/var',
    '/usr',
    '/boot',
    '/root',
    '/sys',
    '/proc',
    'C:\\Windows',
    'C:\\Program Files',
    'C:\\Program Files (x86)',
  ];

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(args: WriteFileArgs): Promise<ToolResult<WriteFileResult>> {
    try {
      if (!args.path) {
        return this.failure('Path is required');
      }

      if (args.content === undefined) {
        return this.failure('Content is required');
      }

      const encoding = args.encoding || 'utf8';

      // Resolve the file path
      const filePath = path.resolve(args.path);

      // Security check: Prevent directory traversal
      if (filePath.includes('..')) {
        return this.failure('Path contains forbidden sequence: ".."');
      }

      // Security check: Prevent access to sensitive files
      const ext = path.extname(filePath).toLowerCase();
      if (this.forbiddenExtensions.includes(ext)) {
        return this.failure(
          `Cannot write to ${ext} files for security reasons`
        );
      }

      // Security check: Prevent access to system directories
      for (const dir of this.forbiddenDirs) {
        if (filePath.startsWith(dir)) {
          return this.failure(`Cannot write to ${dir} for security reasons`);
        }
      }

      // Check if the file exists
      let fileExists = false;
      let overwritten = false;

      try {
        const stats = await fs.stat(filePath);
        fileExists = stats.isFile();
      } catch (_error) {
        // File doesn't exist, that's fine for writing
      }

      // If the file exists and force is not true, ask for confirmation
      if (fileExists && args.force !== true) {
        const response = await prompts(
          {
            type: 'confirm',
            name: 'overwrite',
            message: `File ${filePath} already exists. Overwrite?`,
            initial: false,
          },
          {
            onCancel: () => {
              return { overwrite: false };
            },
          }
        );

        if (!response.overwrite) {
          return this.failure('Operation cancelled by user');
        }

        overwritten = true;
      } else if (fileExists) {
        overwritten = true;
      }

      // Ensure directory exists
      const dirPath = path.dirname(filePath);
      await fs.mkdir(dirPath, { recursive: true });

      // Write the file
      // Convert content to string if it's not already
      const contentString =
        typeof args.content === 'string'
          ? args.content
          : JSON.stringify(args.content);

      await fs.writeFile(filePath, contentString, { encoding });

      // Get file size
      const stats = await fs.stat(filePath);
      const bytesWritten = stats.size;

      // Return the result
      return this.success({
        path: filePath,
        overwritten,
        bytesWritten,
      });
    } catch (error) {
      return this.failure(`Error writing file: ${(error as Error).message}`);
    }
  }
}
