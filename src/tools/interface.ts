/**
 * Tool interface for defining tools that can be used by the AI
 */

/**
 * Arguments for a tool execution
 */
export type ToolArgs = Record<string, unknown>;

/**
 * Result of a tool execution
 */
export type ToolResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Tool interface
 */
export interface Tool<TArgs extends ToolArgs = ToolArgs, TResult = unknown> {
  /**
   * Unique identifier for the tool
   */
  name: string;

  /**
   * Human-readable description of what the tool does
   */
  description: string;

  /**
   * Execute the tool with the given arguments
   * @param args Arguments for the tool
   * @returns Promise resolving to the result of the tool execution
   */
  execute(args: TArgs): Promise<ToolResult<TResult>>;
}

/**
 * Error thrown when a tool execution fails
 */
export class ToolError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ToolError';
  }
}

/**
 * Base class for implementing tools
 */
export abstract class BaseTool<
  TArgs extends ToolArgs = ToolArgs,
  TResult = unknown,
> implements Tool<TArgs, TResult>
{
  abstract name: string;
  abstract description: string;
  abstract execute(args: TArgs): Promise<ToolResult<TResult>>;

  /**
   * Helper method to create a successful result
   * @param data Data for the result
   * @returns Successful tool result
   */
  protected success<T>(data?: T): ToolResult<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Helper method to create a failure result
   * @param error Error message
   * @returns Failed tool result
   */
  protected failure(error: string): ToolResult<never> {
    return {
      success: false,
      error,
    };
  }
}
