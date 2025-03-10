import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Message } from './ai/query';
import { logger } from './logging';

/**
 * Session metadata tracking for REPL sessions
 */
export interface SessionMetadata {
  startTime: Date;
  commandCount: number;
  duration: number;
  lastActivityTime: Date;
  sessionId: string;
  backupPath?: string;
}

/**
 * Session data including metadata and command history
 */
export interface SessionData {
  metadata: SessionMetadata;
  commandHistory: string[];
  conversationHistory: Message[];
  sessionState?: Record<string, unknown>;
}

/**
 * Session persistence options
 */
export interface SessionOptions {
  /**
   * Directory to store session files
   * Default: ~/.vibe-cli
   */
  sessionDir?: string;

  /**
   * Maximum number of command history entries
   * Default: 100
   */
  maxHistorySize?: number;

  /**
   * Whether to enable automatic backups
   * Default: true
   */
  enableBackups?: boolean;

  /**
   * How often to backup the session (in milliseconds)
   * Default: 5 minutes (300000ms)
   */
  backupInterval?: number;

  /**
   * Maximum number of backups to keep
   * Default: 5
   */
  maxBackups?: number;
}

/**
 * Session manager for handling session persistence and history management
 */
export class SessionManager {
  private sessionData: SessionData;
  private sessionFilePath: string;
  private sessionDir: string;
  private readonly MAX_HISTORY_SIZE: number;
  private backupInterval: number;
  private maxBackups: number;
  private enableBackups: boolean;
  private backupTimer?: NodeJS.Timeout;
  private static instance: SessionManager;

  /**
   * Create a session manager
   * @param options Session options
   */
  private constructor(options?: SessionOptions) {
    // Set session directory
    this.sessionDir =
      options?.sessionDir || path.join(os.homedir(), '.vibe-cli');

    // Set session file path
    this.sessionFilePath = path.join(this.sessionDir, 'session.json');

    // Set max history size
    this.MAX_HISTORY_SIZE = options?.maxHistorySize || 100;

    // Set backup options
    this.enableBackups = options?.enableBackups ?? true;
    this.backupInterval = options?.backupInterval || 5 * 60 * 1000; // 5 minutes
    this.maxBackups = options?.maxBackups || 5;

    // Initialize with default session data
    this.sessionData = {
      metadata: {
        startTime: new Date(),
        commandCount: 0,
        duration: 0,
        lastActivityTime: new Date(),
        sessionId: this.generateSessionId(),
      },
      commandHistory: [],
      conversationHistory: [],
    };
  }

  /**
   * Get singleton instance of session manager
   * @param options Session options
   * @returns SessionManager instance
   */
  public static getInstance(options?: SessionOptions): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(options);
    }
    return SessionManager.instance;
  }

  /**
   * Initialize the session manager
   */
  public async initialize(): Promise<void> {
    try {
      // Create session directory if it doesn't exist
      await fs.mkdir(this.sessionDir, { recursive: true });

      // Load existing session
      await this.loadSession();

      // Update start time for the new session
      this.sessionData.metadata.startTime = new Date();
      this.sessionData.metadata.commandCount = 0;
      this.sessionData.metadata.duration = 0;
      this.sessionData.metadata.lastActivityTime = new Date();

      // Generate a new session ID
      this.sessionData.metadata.sessionId = this.generateSessionId();

      // Start backup timer if enabled
      if (this.enableBackups) {
        this.startBackupTimer();
      }

      // Save session to initialize file
      await this.saveSession();
    } catch (error) {
      logger.error('Error initializing session manager', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Load session data from disk
   */
  private async loadSession(): Promise<void> {
    try {
      const data = await fs.readFile(this.sessionFilePath, 'utf8');
      const parsedData = JSON.parse(data);

      // Validate and convert date strings back to Date objects
      if (parsedData && parsedData.metadata && parsedData.commandHistory) {
        parsedData.metadata.startTime = new Date(parsedData.metadata.startTime);
        parsedData.metadata.lastActivityTime = new Date(
          parsedData.metadata.lastActivityTime
        );

        // Only load command history from previous session
        // Create a new session with fresh data but preserve history
        this.sessionData.commandHistory = parsedData.commandHistory || [];

        // Load conversation history if exists
        if (
          parsedData.conversationHistory &&
          Array.isArray(parsedData.conversationHistory)
        ) {
          this.sessionData.conversationHistory = parsedData.conversationHistory;
        }
      }

      logger.info('Session loaded successfully', {
        sessionPath: this.sessionFilePath,
        historySize: this.sessionData.commandHistory.length,
        conversationSize: this.sessionData.conversationHistory.length,
      });
    } catch (error) {
      // Ignore if file doesn't exist, use defaults
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.error('Error loading session data', {
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Save session data to disk
   */
  public async saveSession(): Promise<void> {
    try {
      // Update duration before saving
      this.updateDuration();

      // Create directory if it doesn't exist
      await fs.mkdir(this.sessionDir, { recursive: true });

      // Write data to file
      await fs.writeFile(
        this.sessionFilePath,
        JSON.stringify(this.sessionData, null, 2),
        'utf8'
      );

      logger.debug('Session saved successfully', {
        sessionPath: this.sessionFilePath,
        historySize: this.sessionData.commandHistory.length,
      });
    } catch (error) {
      logger.error('Error saving session data', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Create a backup of the current session
   */
  public async backupSession(): Promise<void> {
    try {
      // Skip if no activity since last backup
      if (
        this.sessionData.commandHistory.length === 0 &&
        this.sessionData.conversationHistory.length === 0
      ) {
        return;
      }

      // Create backups directory
      const backupsDir = path.join(this.sessionDir, 'backups');
      await fs.mkdir(backupsDir, { recursive: true });

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const backupFileName = `session-backup-${timestamp}.json`;
      const backupPath = path.join(backupsDir, backupFileName);

      // Save backup
      await fs.writeFile(
        backupPath,
        JSON.stringify(this.sessionData, null, 2),
        'utf8'
      );

      // Store backup path in metadata
      this.sessionData.metadata.backupPath = backupPath;

      // Cleanup old backups
      await this.cleanupBackups(backupsDir);

      logger.info('Session backup created', { backupPath });
    } catch (error) {
      logger.error('Error creating session backup', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Clean up old backups
   * @param backupsDir Directory containing backups
   */
  private async cleanupBackups(backupsDir: string): Promise<void> {
    try {
      // List all backup files
      const files = await fs.readdir(backupsDir);
      const backups = files
        .filter(
          file => file.startsWith('session-backup-') && file.endsWith('.json')
        )
        .map(file => ({
          name: file,
          path: path.join(backupsDir, file),
          time: file.match(/session-backup-(.+)\.json/)?.[1] || '',
        }))
        .sort((a, b) => b.time.localeCompare(a.time)); // Sort newest first

      // Remove excess backups
      if (backups.length > this.maxBackups) {
        const toRemove = backups.slice(this.maxBackups);
        for (const backup of toRemove) {
          await fs.unlink(backup.path);
          logger.debug('Removed old session backup', { path: backup.path });
        }
      }
    } catch (error) {
      logger.error('Error cleaning up session backups', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Start backup timer
   */
  private startBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
    }

    this.backupTimer = setInterval(() => {
      this.backupSession().catch(error => {
        logger.error('Error in backup timer', {
          error: (error as Error).message,
        });
      });
    }, this.backupInterval);
  }

  /**
   * Stop backup timer
   */
  private stopBackupTimer(): void {
    if (this.backupTimer) {
      clearInterval(this.backupTimer);
      this.backupTimer = undefined;
    }
  }

  /**
   * Generate a session ID
   * @returns Unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Add a command to history
   * @param command Command to add
   */
  public addToHistory(command: string): void {
    // Only add if it's not the same as the last command
    if (
      this.sessionData.commandHistory.length === 0 ||
      this.sessionData.commandHistory[
        this.sessionData.commandHistory.length - 1
      ] !== command
    ) {
      // Add to history
      this.sessionData.commandHistory.push(command);

      // Trim history if it exceeds the maximum size
      if (this.sessionData.commandHistory.length > this.MAX_HISTORY_SIZE) {
        this.sessionData.commandHistory.shift();
      }

      // Update metadata
      this.sessionData.metadata.commandCount++;
      this.sessionData.metadata.lastActivityTime = new Date();

      // Save session after each command
      this.saveSession().catch(error => {
        logger.error('Error saving session after command', {
          error: (error as Error).message,
        });
      });
    }
  }

  /**
   * Add messages to conversation history
   * @param messages Messages to add
   */
  public addToConversationHistory(messages: Message[]): void {
    if (messages.length === 0) {
      return;
    }

    // Add messages to history
    this.sessionData.conversationHistory.push(...messages);

    // Update last activity time
    this.sessionData.metadata.lastActivityTime = new Date();

    // Save session after conversation update
    this.saveSession().catch(error => {
      logger.error('Error saving session after conversation update', {
        error: (error as Error).message,
      });
    });
  }

  /**
   * Get the command history
   */
  public getCommandHistory(): string[] {
    return [...this.sessionData.commandHistory];
  }

  /**
   * Get the conversation history
   */
  public getConversationHistory(): Message[] {
    return [...this.sessionData.conversationHistory];
  }

  /**
   * Clear the conversation history
   */
  public clearConversationHistory(): void {
    this.sessionData.conversationHistory = [];

    // Save session after clearing
    this.saveSession().catch(error => {
      logger.error('Error saving session after clearing conversation', {
        error: (error as Error).message,
      });
    });
  }

  /**
   * Get session metadata
   */
  public getMetadata(): SessionMetadata {
    this.updateDuration();
    return { ...this.sessionData.metadata };
  }

  /**
   * Update session duration
   */
  private updateDuration(): void {
    const now = new Date();
    this.sessionData.metadata.duration =
      (now.getTime() - this.sessionData.metadata.startTime.getTime()) / 1000; // in seconds
  }

  /**
   * Store session state data
   * @param key State key
   * @param value State value
   */
  public setSessionState<T>(key: string, value: T): void {
    if (!this.sessionData.sessionState) {
      this.sessionData.sessionState = {};
    }

    this.sessionData.sessionState[key] = value;

    // Save session after updating state
    this.saveSession().catch(error => {
      logger.error('Error saving session after updating state', {
        error: (error as Error).message,
      });
    });
  }

  /**
   * Get session state data
   * @param key State key
   * @param defaultValue Default value if key doesn't exist
   * @returns State value or default
   */
  public getSessionState<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.sessionData.sessionState) {
      return defaultValue;
    }

    return (this.sessionData.sessionState[key] as T) || defaultValue;
  }

  /**
   * List available session backups
   * @returns Array of backup paths and timestamps
   */
  public async listBackups(): Promise<{ path: string; timestamp: string }[]> {
    try {
      const backupsDir = path.join(this.sessionDir, 'backups');

      // Check if directory exists
      try {
        await fs.access(backupsDir);
      } catch {
        return [];
      }

      // List all backup files
      const files = await fs.readdir(backupsDir);
      return files
        .filter(
          file => file.startsWith('session-backup-') && file.endsWith('.json')
        )
        .map(file => {
          const timestamp = file.match(/session-backup-(.+)\.json/)?.[1] || '';
          return {
            path: path.join(backupsDir, file),
            timestamp: timestamp.replace(/-/g, ':'),
          };
        })
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Sort newest first
    } catch (error) {
      logger.error('Error listing session backups', {
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Restore session from backup
   * @param backupPath Path to backup file
   * @returns True if restore successful
   */
  public async restoreFromBackup(backupPath: string): Promise<boolean> {
    try {
      const data = await fs.readFile(backupPath, 'utf8');
      const parsedData = JSON.parse(data);

      // Validate backup data
      if (!parsedData || !parsedData.metadata || !parsedData.commandHistory) {
        logger.error('Invalid backup data format', { backupPath });
        return false;
      }

      // Make a backup of current session before restoration
      await this.backupSession();

      // Restore data
      parsedData.metadata.startTime = new Date();
      parsedData.metadata.lastActivityTime = new Date();
      parsedData.metadata.sessionId = this.generateSessionId();
      this.sessionData = parsedData;

      // Save restored session
      await this.saveSession();

      logger.info('Session restored from backup', { backupPath });
      return true;
    } catch (error) {
      logger.error('Error restoring session from backup', {
        backupPath,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Close session manager
   */
  public close(): void {
    // Stop backup timer
    this.stopBackupTimer();

    // Save final session state
    this.saveSession().catch(error => {
      logger.error('Error saving session during close', {
        error: (error as Error).message,
      });
    });

    // Backup if enabled
    if (this.enableBackups) {
      this.backupSession().catch(error => {
        logger.error('Error creating backup during close', {
          error: (error as Error).message,
        });
      });
    }
  }
}

/**
 * Global session manager instance
 */
export const sessionManager = SessionManager.getInstance();
