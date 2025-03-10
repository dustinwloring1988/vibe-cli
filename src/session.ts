import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Session metadata tracking for REPL sessions
 */
export interface SessionMetadata {
  startTime: Date;
  commandCount: number;
  duration: number;
  lastActivityTime: Date;
}

/**
 * Session data including metadata and command history
 */
export interface SessionData {
  metadata: SessionMetadata;
  commandHistory: string[];
}

/**
 * Session manager for handling session persistence and history management
 */
export class SessionManager {
  private sessionData: SessionData;
  private sessionFilePath: string;
  private readonly MAX_HISTORY_SIZE = 100;

  constructor() {
    this.sessionFilePath = path.join(os.homedir(), '.vibe-cli-session.json');

    // Initialize with default session data
    this.sessionData = {
      metadata: {
        startTime: new Date(),
        commandCount: 0,
        duration: 0,
        lastActivityTime: new Date(),
      },
      commandHistory: [],
    };
  }

  /**
   * Initialize the session manager
   */
  public async initialize(): Promise<void> {
    try {
      await this.loadSession();

      // Update start time for the new session
      this.sessionData.metadata.startTime = new Date();
      this.sessionData.metadata.commandCount = 0;
      this.sessionData.metadata.duration = 0;
      this.sessionData.metadata.lastActivityTime = new Date();
    } catch (error) {
      console.error('Error initializing session manager:', error);
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
        this.sessionData = parsedData;
      }
    } catch (error) {
      // Ignore if file doesn't exist, use defaults
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Error loading session data:', error);
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
      const dir = path.dirname(this.sessionFilePath);
      await fs.mkdir(dir, { recursive: true });

      // Write data to file
      await fs.writeFile(
        this.sessionFilePath,
        JSON.stringify(this.sessionData, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving session data:', error);
    }
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
        console.error('Error saving session after command:', error);
      });
    }
  }

  /**
   * Get the command history
   */
  public getCommandHistory(): string[] {
    return [...this.sessionData.commandHistory];
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
}

/**
 * Global session manager instance
 */
export const sessionManager = new SessionManager();
