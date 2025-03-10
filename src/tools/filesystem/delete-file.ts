import { BaseTool, ToolArgs, ToolResult } from '../interface';
import fs from 'fs/promises';
import path from 'path';
import prompts from 'prompts';

/**
 * Arguments for the DeleteFile tool
 */
export interface DeleteFileArgs extends ToolArgs {
  /**
   * The file path to delete
   */
  path: string;

  /**
   * Whether to skip confirmation (defaults to false)
   * WARNING: Use with caution!
   */
  force?: boolean;
}

/**
 * Result of a DeleteFile operation
 */
export interface DeleteFileResult {
  /**
   * The absolute path of the file that was deleted
   */
  path: string;

  /**
   * Whether the file was successfully deleted
   */
  deleted: boolean;
}

/**
 * Tool for deleting files with confirmation
 */
export class DeleteFileTool extends BaseTool<DeleteFileArgs, DeleteFileResult> {
  name = 'deleteFile';
  description = 'Deletes a file with confirmation prompt for safety';

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
    '.git',
    '.gitignore',
    '.npmrc',
    '.yarnrc',
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
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
    '.git',
    'node_modules',
  ];

  /**
   * Execute the tool
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  async execute(args: DeleteFileArgs): Promise<ToolResult<DeleteFileResult>> {
    try {
      if (!args.path) {
        return this.failure('Path is required');
      }

      // Resolve the file path
      const filePath = path.resolve(args.path);

      // Security check: Prevent directory traversal
      if (filePath.includes('..')) {
        return this.failure('Path contains forbidden sequence: ".."');
      }

      // Security check: Prevent deletion of important file types
      const ext = path.extname(filePath).toLowerCase();
      const basename = path.basename(filePath).toLowerCase();
      if (
        this.forbiddenExtensions.includes(ext) ||
        this.forbiddenExtensions.includes(basename)
      ) {
        return this.failure(`Cannot delete ${filePath} - protected file type`);
      }

      // Security check: Prevent access to system directories
      for (const dir of this.forbiddenDirs) {
        if (
          filePath.startsWith(dir) ||
          filePath.includes(`/${dir}/`) ||
          filePath.includes(`\\${dir}\\`)
        ) {
          return this.failure(
            `Cannot delete files in ${dir} for security reasons`
          );
        }
      }

      // Check if the file exists
      let fileExists = false;

      try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
          return this.failure(
            `Path ${filePath} is not a file. To delete directories, use a different tool.`
          );
        }
        fileExists = true;
      } catch (_error) {
        return this.failure(`File not found: ${filePath}`);
      }

      // If the file exists and force is not true, ask for confirmation
      if (fileExists && args.force !== true) {
        const response = await prompts(
          {
            type: 'confirm',
            name: 'confirm',
            message: `Are you sure you want to delete the file ${filePath}? This action cannot be undone.`,
            initial: false,
          },
          {
            onCancel: () => {
              return { confirm: false };
            },
          }
        );

        if (!response.confirm) {
          return this.failure('Operation cancelled by user');
        }
      }

      // Delete the file
      await fs.unlink(filePath);

      // Return the result
      return this.success({
        path: filePath,
        deleted: true,
      });
    } catch (error) {
      return this.failure(`Error deleting file: ${(error as Error).message}`);
    }
  }
}
