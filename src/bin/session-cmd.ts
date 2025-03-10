#!/usr/bin/env node

/**
 * Session management command handler
 */
import * as yargs from 'yargs';
import path from 'path';
import { sessionManager } from '../session';
import { logger } from '../logging';

/**
 * Session command handler
 */
export async function handleSessionCommand(
  args: yargs.ArgumentsCamelCase<{
    action?: string;
    path?: string;
    _?: (string | number)[];
  }>
): Promise<void> {
  // Determine action
  const action = args.action || 'info';

  try {
    switch (action) {
      case 'info':
        await handleSessionInfo();
        break;

      case 'list-backups':
        await handleListBackups();
        break;

      case 'restore':
        if (!args.path) {
          console.error(
            'Error: You must provide --path parameter for restore action'
          );
          return;
        }
        await handleRestoreSession(args.path as string);
        break;

      case 'clear':
        await handleClearSession();
        break;

      case 'backup':
        await handleBackupSession();
        break;

      default:
        console.error(`Unknown action: ${action}`);
        console.log(
          'Available actions: info, list-backups, restore, clear, backup'
        );
    }
  } catch (error) {
    logger.error(
      `Error handling session command: ${(error as Error).message}`,
      {
        action,
      }
    );
    console.error(`Error: ${(error as Error).message}`);
  }
}

/**
 * Handle showing session info
 */
async function handleSessionInfo(): Promise<void> {
  const metadata = sessionManager.getMetadata();
  const commandHistory = sessionManager.getCommandHistory();
  const conversationHistory = sessionManager.getConversationHistory();

  console.log('Session Information:');
  console.log(`- Session ID: ${metadata.sessionId}`);
  console.log(`- Started: ${metadata.startTime.toLocaleString()}`);
  console.log(`- Last Activity: ${metadata.lastActivityTime.toLocaleString()}`);
  console.log(`- Duration: ${formatDuration(metadata.duration)}`);
  console.log(`- Commands: ${metadata.commandCount}`);
  console.log(`- Command History Size: ${commandHistory.length} items`);
  console.log(
    `- Conversation History Size: ${conversationHistory.length} messages`
  );

  if (metadata.backupPath) {
    console.log(`- Last Backup: ${path.basename(metadata.backupPath)}`);
  }
}

/**
 * Handle listing session backups
 */
async function handleListBackups(): Promise<void> {
  const backups = await sessionManager.listBackups();

  if (backups.length === 0) {
    console.log('No session backups found.');
    return;
  }

  console.log(`Found ${backups.length} session backups:`);
  backups.forEach((backup, index) => {
    const timestamp = new Date(backup.timestamp).toLocaleString();
    console.log(`${index + 1}. ${path.basename(backup.path)} - ${timestamp}`);
  });

  console.log('\nTo restore a backup, use:');
  console.log(`vibe session --action restore --path <backup-path>`);
}

/**
 * Handle restoring a session from backup
 * @param backupPath Path to backup file
 */
async function handleRestoreSession(backupPath: string): Promise<void> {
  console.log(`Restoring session from: ${backupPath}`);

  const success = await sessionManager.restoreFromBackup(backupPath);

  if (success) {
    console.log('Session restored successfully!');
  } else {
    console.error('Failed to restore session from backup.');
  }
}

/**
 * Handle clearing the current session
 */
async function handleClearSession(): Promise<void> {
  // Clear conversation history but keep command history
  sessionManager.clearConversationHistory();

  console.log('Conversation history cleared.');
  console.log('Command history is preserved.');
}

/**
 * Handle creating a backup of the current session
 */
async function handleBackupSession(): Promise<void> {
  // Create a backup using the now-public method
  await sessionManager.backupSession();

  console.log('Session backup created successfully!');

  // Show backup list
  await handleListBackups();
}

/**
 * Format duration in seconds to human readable format
 * @param seconds Duration in seconds
 * @returns Formatted duration string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0 || parts.length === 0)
    parts.push(`${remainingSeconds}s`);

  return parts.join(' ');
}
