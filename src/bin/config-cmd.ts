#!/usr/bin/env node

/**
 * Configuration command handler
 */
import * as yargs from 'yargs';
import fs from 'fs/promises';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';
import { initializeConfig, getCurrentConfig, updateConfig } from '../config';
import { ConfigManager } from '../configManager';
import { logger } from '../logging';

const exec = promisify(execCallback);

/**
 * Configuration command handler
 */
export async function handleConfigCommand(
  args: yargs.ArgumentsCamelCase<{
    action?: string;
    property?: string;
    value?: string;
    editor?: boolean;
    _?: (string | number)[];
  }>
): Promise<void> {
  // Initialize configuration
  await initializeConfig();
  const configManager = ConfigManager.getInstance();
  const configPath = configManager.getConfigPath();

  // Determine action
  const action = args.action || 'view';

  try {
    switch (action) {
      case 'view':
        await handleViewConfig(args.property);
        break;

      case 'edit':
        if (args.editor) {
          await handleEditConfigWithEditor();
        } else if (args.property && args.value !== undefined) {
          await handleSetConfigValue(args.property, args.value);
        } else {
          console.error(
            'Error: You must provide both --property and --value, or use --editor.'
          );
        }
        break;

      case 'reset':
        await handleResetConfig();
        break;

      case 'path':
        console.log(`Configuration path: ${configPath}`);
        break;

      default:
        console.error(`Unknown action: ${action}`);
        console.log('Available actions: view, edit, reset, path');
    }
  } catch (error) {
    logger.error(`Error handling config command: ${(error as Error).message}`, {
      action,
      property: args.property,
    });
    console.error(`Error: ${(error as Error).message}`);
  }
}

/**
 * Handle viewing configuration
 * @param property Optional property path to view specific part of config
 */
async function handleViewConfig(property?: string): Promise<void> {
  const config = getCurrentConfig();

  if (!property) {
    // Show entire config
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  // Parse property path (e.g. "ollama.apiUrl")
  const parts = property.split('.');
  let value: unknown = config;

  for (const part of parts) {
    if (value === undefined || value === null) {
      console.error(`Property not found: ${property}`);
      return;
    }

    value = (value as Record<string, unknown>)[part];
  }

  if (value === undefined) {
    console.error(`Property not found: ${property}`);
    return;
  }

  // Display property value
  if (typeof value === 'object') {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
}

/**
 * Handle editing configuration with external editor
 */
async function handleEditConfigWithEditor(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const configPath = configManager.getConfigPath();

  // Ensure config file exists
  const fileExists = await configFileExists(configPath);
  if (!fileExists) {
    // Create default config if it doesn't exist
    await configManager.saveConfig();
  }

  // Determine which editor to use
  const editor =
    process.env.EDITOR ||
    process.env.VISUAL ||
    (process.platform === 'win32' ? 'notepad' : 'vi');

  console.log(`Opening ${configPath} with ${editor}...`);

  try {
    // Launch editor
    const { stderr } = await exec(`${editor} "${configPath}"`);

    if (stderr) {
      console.error(`Editor error: ${stderr}`);
      return;
    }

    console.log('Configuration updated successfully.');

    // Reload config
    await initializeConfig();
  } catch (error) {
    console.error(`Error launching editor: ${(error as Error).message}`);
  }
}

/**
 * Handle setting a specific configuration value
 * @param property Property path (e.g. "ollama.apiUrl")
 * @param value New value
 */
async function handleSetConfigValue(
  property: string,
  value: string
): Promise<void> {
  // Parse property path (e.g. "ollama.apiUrl")
  const parts = property.split('.');

  if (parts.length === 0) {
    console.error('Invalid property path');
    return;
  }

  // Create update object with nested structure
  let updateObj: Record<string, unknown> = {};
  let current = updateObj;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (i === parts.length - 1) {
      // This is the final property, set the value
      // Try to parse as JSON if it looks like an object, array, or boolean
      if (
        (value.startsWith('{') && value.endsWith('}')) ||
        (value.startsWith('[') && value.endsWith(']')) ||
        value === 'true' ||
        value === 'false' ||
        value === 'null' ||
        (!isNaN(Number(value)) && value.trim() !== '')
      ) {
        try {
          current[part] = JSON.parse(value);
        } catch {
          // If parsing fails, use the string value
          current[part] = value;
        }
      } else {
        current[part] = value;
      }
    } else {
      // Create nested object
      current[part] = {};
      current = current[part] as Record<string, unknown>;
    }
  }

  // Update config
  await updateConfig(updateObj);

  console.log(`Updated ${property} to ${value}`);
}

/**
 * Handle resetting configuration to defaults
 */
async function handleResetConfig(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  await configManager.resetConfig();

  // Reload config
  await initializeConfig();

  console.log('Configuration reset to defaults.');
}

/**
 * Check if config file exists
 * @param filePath Path to config file
 * @returns True if file exists
 */
async function configFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
