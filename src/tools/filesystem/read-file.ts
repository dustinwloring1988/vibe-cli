import { BaseTool, ToolArgs, ToolResult, suppressError } from '../interface';
import fs from 'fs/promises';
import path from 'path';

/**
 * Arguments for the ReadFile tool
 */
export interface ReadFileArgs extends ToolArgs {
  /**
   * The file path to read
   */
  path: string;

  /**
   * The encoding to use (defaults to 'utf8')
   */
  encoding?: BufferEncoding;
}

/**
 * Result of a ReadFile operation
 */
export interface ReadFileResult {
  /**
   * The absolute path of the file
   */
  path: string;

  /**
   * The content of the file
   */
  content: string;

  /**
   * The encoding used to read the file
   */
  encoding: BufferEncoding;
}

/**
 * Tool for reading files
 */
export class ReadFileTool extends BaseTool<ReadFileArgs, ReadFileResult> {
  name = 'readFile';
  description = 'Reads the content of a file';

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
  async execute(args: ReadFileArgs): Promise<ToolResult<ReadFileResult>> {
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
        return this.failure(`Access to ${ext} files is forbidden`);
      }

      // Security check: Prevent access to system directories
      for (const dir of this.forbiddenDirs) {
        if (filePath.startsWith(dir)) {
          return this.failure(`Access to ${dir} is forbidden`);
        }
      }

      // Check if the file exists
      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          return this.failure(`Path ${filePath} is not a file`);
        }
      } catch (_error) {
        suppressError(_error);
        return this.failure(`File not found: ${filePath}`);
      }

      // Read the file
      const content = await fs.readFile(filePath, { encoding });

      // Return the result
      return this.success({
        path: filePath,
        content,
        encoding,
      });
    } catch (_error) {
      suppressError(_error);
      return this.failure(`Error reading file: ${(_error as Error).message}`);
    }
  }
}
