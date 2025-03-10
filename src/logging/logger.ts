import fs from 'fs';
import path from 'path';
import { createWriteStream, WriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { config } from '../config';

/**
 * Log severity levels
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * Log entry format for structured logging
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Options for logger configuration
 */
export interface LoggerOptions {
  /**
   * Directory to store log files
   */
  logDir: string;

  /**
   * Maximum size of log files in bytes before rotation
   * Default: 10MB
   */
  maxFileSize?: number;

  /**
   * Number of log files to keep for rotation
   * Default: 5
   */
  maxFiles?: number;

  /**
   * Whether to enable console logging
   * Default: true
   */
  enableConsole?: boolean;

  /**
   * Minimum log level to record
   * Default: INFO
   */
  minLevel?: LogLevel;
}

/**
 * Logger class for handling structured logging with file rotation
 */
export class Logger {
  private static instance: Logger;
  private options: Required<LoggerOptions>;
  private actionLogStream: WriteStream | null = null;
  private errorLogStream: WriteStream | null = null;
  private actionLogSize = 0;
  private errorLogSize = 0;

  /**
   * Create a new logger
   * @param options Logger configuration options
   */
  private constructor(options: LoggerOptions) {
    this.options = {
      logDir: options.logDir,
      maxFileSize: options.maxFileSize ?? 10 * 1024 * 1024, // 10MB default
      maxFiles: options.maxFiles ?? 5,
      enableConsole: options.enableConsole ?? true,
      minLevel: options.minLevel ?? LogLevel.INFO,
    };

    this.initializeLogStreams();
  }

  /**
   * Initialize log file streams
   */
  private async initializeLogStreams(): Promise<void> {
    try {
      // Ensure log directory exists
      await mkdir(this.options.logDir, { recursive: true });

      // Create or open action log file
      const actionLogPath = path.join(this.options.logDir, 'actions.log');
      if (fs.existsSync(actionLogPath)) {
        const stats = fs.statSync(actionLogPath);
        this.actionLogSize = stats.size;
      }

      this.actionLogStream = createWriteStream(actionLogPath, { flags: 'a' });

      // Create or open error log file
      const errorLogPath = path.join(this.options.logDir, 'error.log');
      if (fs.existsSync(errorLogPath)) {
        const stats = fs.statSync(errorLogPath);
        this.errorLogSize = stats.size;
      }

      this.errorLogStream = createWriteStream(errorLogPath, { flags: 'a' });
    } catch (error) {
      console.error('Failed to initialize log streams:', error);
    }
  }

  /**
   * Get singleton logger instance
   * @param options Logger configuration options
   * @returns Logger instance
   */
  public static getInstance(options?: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(
        options ?? {
          logDir: path.join(process.cwd(), 'logs'),
        }
      );
    }
    return Logger.instance;
  }

  /**
   * Log a message at the given level
   * @param level Log level
   * @param message Message to log
   * @param context Additional context for the log entry
   */
  public log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): void {
    // Skip logging if level is below minimum
    if (this.shouldSkipLogging(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    const logLine = JSON.stringify(entry) + '\n';

    // Log to console if enabled
    if (this.options.enableConsole) {
      this.logToConsole(entry);
    }

    // Log to appropriate file based on level
    if (level === LogLevel.ERROR) {
      this.logToErrorFile(logLine);
    } else {
      this.logToActionFile(logLine);
    }
  }

  /**
   * Check if logging should be skipped based on level
   * @param level Log level to check
   * @returns True if logging should be skipped
   */
  private shouldSkipLogging(level: LogLevel): boolean {
    const levelOrder = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARNING]: 2,
      [LogLevel.ERROR]: 3,
    };

    return levelOrder[level] < levelOrder[this.options.minLevel];
  }

  /**
   * Log to console with appropriate formatting
   * @param entry Log entry to display
   */
  private logToConsole(entry: LogEntry): void {
    // Only log to console in debug mode
    if (!config.app.debug && entry.level === LogLevel.DEBUG) {
      return;
    }

    let consoleMethod: 'log' | 'info' | 'warn' | 'error' = 'log';

    switch (entry.level) {
      case LogLevel.DEBUG:
        consoleMethod = 'log';
        break;
      case LogLevel.INFO:
        consoleMethod = 'info';
        break;
      case LogLevel.WARNING:
        consoleMethod = 'warn';
        break;
      case LogLevel.ERROR:
        consoleMethod = 'error';
        break;
    }

    if (entry.context) {
      console[consoleMethod](
        `[${entry.timestamp}] [${entry.level}] ${entry.message}`,
        entry.context
      );
    } else {
      console[consoleMethod](
        `[${entry.timestamp}] [${entry.level}] ${entry.message}`
      );
    }
  }

  /**
   * Log to action log file with rotation
   * @param logLine Log line to write
   */
  private logToActionFile(logLine: string): void {
    if (!this.actionLogStream) {
      return;
    }

    this.actionLogSize += Buffer.byteLength(logLine);
    this.actionLogStream.write(logLine);

    // Check if rotation is needed
    if (this.actionLogSize >= this.options.maxFileSize) {
      this.rotateLog('actions.log');
    }
  }

  /**
   * Log to error log file with rotation
   * @param logLine Log line to write
   */
  private logToErrorFile(logLine: string): void {
    if (!this.errorLogStream) {
      return;
    }

    this.errorLogSize += Buffer.byteLength(logLine);
    this.errorLogStream.write(logLine);

    // Check if rotation is needed
    if (this.errorLogSize >= this.options.maxFileSize) {
      this.rotateLog('error.log');
    }
  }

  /**
   * Rotate log file
   * @param logFile Name of log file to rotate
   */
  private rotateLog(logFile: string): void {
    const logPath = path.join(this.options.logDir, logFile);

    // Close current stream
    if (logFile === 'actions.log' && this.actionLogStream) {
      this.actionLogStream.end();
      this.actionLogStream = null;
    } else if (logFile === 'error.log' && this.errorLogStream) {
      this.errorLogStream.end();
      this.errorLogStream = null;
    }

    try {
      // Shift existing log files
      for (let i = this.options.maxFiles - 1; i > 0; i--) {
        const oldPath = path.join(this.options.logDir, `${logFile}.${i}`);
        const newPath = path.join(this.options.logDir, `${logFile}.${i + 1}`);

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      }

      // Move current log to .1
      if (fs.existsSync(logPath)) {
        fs.renameSync(logPath, path.join(this.options.logDir, `${logFile}.1`));
      }

      // Reset size counter and reopen stream
      if (logFile === 'actions.log') {
        this.actionLogSize = 0;
        this.actionLogStream = createWriteStream(logPath, { flags: 'a' });
      } else if (logFile === 'error.log') {
        this.errorLogSize = 0;
        this.errorLogStream = createWriteStream(logPath, { flags: 'a' });
      }
    } catch (error) {
      console.error(`Error rotating log file ${logFile}:`, error);
    }
  }

  /**
   * Log debug message
   * @param message Message to log
   * @param context Additional context
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   * @param message Message to log
   * @param context Additional context
   */
  public info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   * @param message Message to log
   * @param context Additional context
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARNING, message, context);
  }

  /**
   * Log error message
   * @param message Message to log
   * @param context Additional context
   */
  public error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log tool execution
   * @param toolName Name of the tool
   * @param args Arguments passed to the tool
   * @param result Result of the tool execution
   * @param durationMs Execution duration in milliseconds
   */
  public logToolExecution(
    toolName: string,
    args: Record<string, unknown>,
    result: { success: boolean; error?: string },
    durationMs: number
  ): void {
    const level = result.success ? LogLevel.INFO : LogLevel.ERROR;
    const message = result.success
      ? `Tool execution: ${toolName}`
      : `Tool execution failed: ${toolName} - ${result.error}`;

    this.log(level, message, {
      tool: toolName,
      args,
      success: result.success,
      durationMs,
      ...(result.error ? { error: result.error } : {}),
    });
  }

  /**
   * Close log streams
   */
  public close(): void {
    if (this.actionLogStream) {
      this.actionLogStream.end();
      this.actionLogStream = null;
    }

    if (this.errorLogStream) {
      this.errorLogStream.end();
      this.errorLogStream = null;
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = Logger.getInstance();
