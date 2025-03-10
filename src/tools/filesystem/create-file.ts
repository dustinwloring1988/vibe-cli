import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments for the CreateFile tool
 */
export interface CreateFileArgs extends ToolArgs {
  /**
   * The file path to create
   */
  path: string;

  /**
   * Initial content to write to the file (optional)
   */
  content?: string;

  /**
   * The encoding to use (defaults to 'utf8')
   */
  encoding?: BufferEncoding;
}

/**
 * Result of a CreateFile operation
 */
export interface CreateFileResult {
  /**
   * The absolute path of the file that was created
   */
  path: string;

  /**
   * Whether the operation was successful
   */
  created: boolean;

  /**
   * The number of bytes written (if content was provided)
   */
  bytesWritten?: number;
}

/**
 * Tool for creating new files
 */
export class CreateFileTool extends BaseTool<CreateFileArgs, CreateFileResult> {
  name = 'createFile';
  description = 'Creates a new file with optional initial content';

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
  async execute(args: CreateFileArgs): Promise<ToolResult<CreateFileResult>> {
    try {
      if (!args.path) {
        return this.failure('Path is required');
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
        return this.failure(`Cannot create ${ext} files for security reasons`);
      }

      // Security check: Prevent access to system directories
      for (const dir of this.forbiddenDirs) {
        if (filePath.startsWith(dir)) {
          return this.failure(
            `Cannot create files in ${dir} for security reasons`
          );
        }
      }

      // Check if the file already exists
      let fileExists = false;

      try {
        const stats = await fs.stat(filePath);
        fileExists = stats.isFile();
      } catch (_error) {
        // File doesn't exist, which is what we want for creating a new file
        suppressError(_error);
      }

      // If the file exists, ask for confirmation to overwrite
      if (fileExists) {
        return this.failure(
          `File ${filePath} already exists. Use writeFile tool to modify existing files.`
        );
      }

      // Ensure the directory exists
      const dirPath = path.dirname(filePath);
      try {
        await fs.mkdir(dirPath, { recursive: true });
      } catch (error) {
        return this.failure(
          `Error creating directory: ${(error as Error).message}`
        );
      }

      // Create the file with initial content or empty
      const content = args.content || '';
      await fs.writeFile(filePath, content, { encoding });

      // Get file size if content was provided
      let bytesWritten: number | undefined;
      if (args.content) {
        const stats = await fs.stat(filePath);
        bytesWritten = stats.size;
      }

      // Return the result
      return this.success({
        path: filePath,
        created: true,
        bytesWritten,
      });
    } catch (error) {
      return this.failure(`Error creating file: ${(error as Error).message}`);
    }
  }
}
