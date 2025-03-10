import { Tool, ToolError } from './interface';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config';
import { logger } from '../logging';

/**
 * Registry for tools
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool in the registry
   * @param tool Tool to register
   */
  public register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(
        `Tool with name "${tool.name}" is already registered. Overwriting.`
      );
    }

    this.tools.set(tool.name, tool);

    if (config.app.debug) {
      console.log(`Tool "${tool.name}" registered.`);
    }
  }

  /**
   * Get a tool by name
   * @param name Name of the tool to get
   * @returns The tool, or undefined if not found
   */
  public get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists in the registry
   * @param name Name of the tool to check
   * @returns True if the tool exists, false otherwise
   */
  public has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tools in the registry
   * @returns Array of all registered tools
   */
  public getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name
   * @param name Name of the tool to execute
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   * @throws {ToolError} If the tool does not exist or execution fails
   */
  public async execute<T>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const tool = this.tools.get(name);
    if (!tool) {
      const error = `Tool "${name}" not found`;
      logger.error(error, { toolName: name });
      throw new ToolError(error, name);
    }

    const startTime = Date.now();
    let result;

    try {
      result = await tool.execute(args);
      const durationMs = Date.now() - startTime;

      // Log tool execution result
      logger.logToolExecution(name, args, result, durationMs);

      if (!result.success) {
        throw new ToolError(result.error || 'Unknown error', name);
      }
      return result.data as T;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Log error if not already logged
      if (!result) {
        logger.logToolExecution(
          name,
          args,
          { success: false, error: errorMsg },
          durationMs
        );
      }

      if (error instanceof ToolError) {
        throw error;
      }
      throw new ToolError(
        `Error executing tool "${name}": ${errorMsg}`,
        name,
        error as Error
      );
    }
  }

  /**
   * Load tools from a directory
   * @param directory Directory to load tools from
   */
  public async loadFromDirectory(directory: string): Promise<void> {
    try {
      // Get all TypeScript files in the directory
      const files = await fs.readdir(directory);
      const tsFiles = files.filter(
        file =>
          file.endsWith('.ts') &&
          !file.endsWith('.d.ts') &&
          !file.endsWith('interface.ts') &&
          !file.endsWith('registry.ts')
      );

      // Load each tool file
      for (const file of tsFiles) {
        try {
          const filePath = path.join(directory, file);
          // Use dynamic import to load the module
          const module = await import(filePath);

          // Look for a Tool instance in the module exports
          const exports = Object.values(module);
          const toolClass = exports.find(
            exp =>
              typeof exp === 'function' &&
              exp.prototype &&
              'execute' in exp.prototype
          ) as { new (): Tool } | undefined;

          if (toolClass) {
            const tool = new toolClass();
            this.register(tool);
          } else {
            console.warn(`No valid tool found in ${file}`);
          }
        } catch (error) {
          console.error(`Error loading tool from ${file}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error loading tools from directory ${directory}:`, error);
    }
  }
}

/**
 * Global tool registry instance
 */
export const toolRegistry = new ToolRegistry();
