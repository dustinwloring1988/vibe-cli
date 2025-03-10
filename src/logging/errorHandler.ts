import { logger } from './logger';

/**
 * Interface for extended error information
 */
export interface ErrorDetails {
  /**
   * Error message
   */
  message: string;

  /**
   * Error code or type
   */
  code?: string;

  /**
   * Additional context for the error
   */
  context?: Record<string, unknown>;

  /**
   * Original error object
   */
  originalError?: Error;
}

/**
 * Utility class for centralized error handling
 */
export class ErrorHandler {
  /**
   * Handle an error, logging it and formatting a user-friendly message
   * @param errorDetails Error details
   * @returns User-friendly error message
   */
  public static handle(errorDetails: ErrorDetails): string {
    const { message, code, context, originalError } = errorDetails;

    // Log the error
    logger.error(message, {
      ...(code ? { code } : {}),
      ...(context || {}),
      ...(originalError
        ? {
            stack: originalError.stack,
            name: originalError.name,
          }
        : {}),
    });

    // Return user-friendly message
    return code ? `Error [${code}]: ${message}` : `Error: ${message}`;
  }

  /**
   * Create an error handler for a specific component
   * @param component Component name for error context
   * @returns Handler function for the component
   */
  public static forComponent(
    component: string
  ): (error: Error | string, context?: Record<string, unknown>) => string {
    return (
      error: Error | string,
      context?: Record<string, unknown>
    ): string => {
      const message = typeof error === 'string' ? error : error.message;

      return ErrorHandler.handle({
        message,
        context: {
          ...context,
          component,
        },
        originalError: typeof error === 'object' ? error : undefined,
      });
    };
  }

  /**
   * Handle a fatal error that requires application shutdown
   * @param errorDetails Error details
   * @param exitCode Process exit code (defaults to 1)
   */
  public static handleFatal(errorDetails: ErrorDetails, exitCode = 1): never {
    const message = ErrorHandler.handle(errorDetails);

    console.error('\n' + message);
    console.error('Fatal error occurred. Application will now exit.');

    // Exit the process
    process.exit(exitCode);
  }

  /**
   * Process uncaught exceptions and unhandled rejections
   * @param error Error object
   * @param origin Error origin (exception or rejection)
   */
  public static handleUncaught(error: Error, origin: string): void {
    logger.error(`Uncaught ${origin}`, {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });

    console.error(`\nUncaught ${origin}: ${error.message}`);
    console.error(
      'This is a critical error. Application may be in an unstable state.'
    );
  }

  /**
   * Setup global error handlers for uncaught exceptions and unhandled rejections
   */
  public static setupGlobalHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      ErrorHandler.handleUncaught(error, 'exception');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', reason => {
      const error =
        reason instanceof Error ? reason : new Error(String(reason));

      ErrorHandler.handleUncaught(error, 'rejection');
    });

    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal. Shutting down gracefully...');

      // Close logger streams
      logger.close();

      // Exit with success code since this is a controlled shutdown
      process.exit(0);
    });
  }
}
