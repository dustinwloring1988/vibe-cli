/**
 * vibe-cli: A terminal-based AI coding agent
 */

// Export core functionality
export * from './bin/vibe';
export * from './repl';
export * from './agent';
export * from './config';
export * from './context';
export * from './tools';
export * from './logging';
// TODO: Export additional functionality as it's implemented

// Initialize global error handlers
import { ErrorHandler } from './logging';
ErrorHandler.setupGlobalHandlers();
