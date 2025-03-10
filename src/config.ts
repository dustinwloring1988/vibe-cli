import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration loaded from environment variables
 */
export interface Config {
  ollama: {
    apiUrl: string;
    model: string;
  };
  app: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    debug: boolean;
  };
}

/**
 * Get the configuration from environment variables
 */
export function getConfig(): Config {
  return {
    ollama: {
      apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api',
      model: process.env.OLLAMA_MODEL || 'llama3',
    },
    app: {
      logLevel:
        (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') ||
        'info',
      debug: process.env.DEBUG === 'true',
    },
  };
}

/**
 * Current application configuration
 */
export const config = getConfig();

/**
 * Validate that the configuration is valid and the Ollama API is reachable
 */
export async function validateConfig(): Promise<boolean> {
  // Check if the API URL is set
  if (!config.ollama.apiUrl) {
    console.error(
      'Error: OLLAMA_API_URL is not set in the environment variables'
    );
    return false;
  }

  // Check if the model is set
  if (!config.ollama.model) {
    console.error(
      'Error: OLLAMA_MODEL is not set in the environment variables'
    );
    return false;
  }

  // Skip connection check in test mode
  if (process.env.NODE_ENV === 'test') {
    return true;
  }

  // If not verbose mode, skip connection check for better UX
  if (
    process.argv.indexOf('--verbose') === -1 &&
    process.argv.indexOf('-v') === -1 &&
    process.argv.indexOf('test-connection') === -1
  ) {
    return true;
  }

  // Check if the server is reachable
  try {
    // Try to get list of models from Ollama to confirm connection
    const response = await axios.get(
      `${config.ollama.apiUrl.replace('/api', '')}/api/tags`
    );

    // Verify the response contains models
    const models = response.data.models;
    if (!models || !Array.isArray(models)) {
      console.error('Error: Invalid response from Ollama API');
      return false;
    }

    // Check if our configured model exists
    const modelExists = models.some(
      (model: { name: string }) => model.name === config.ollama.model
    );

    if (!modelExists) {
      console.warn(
        `Warning: Model "${config.ollama.model}" not found in the available models.`
      );
      console.warn('Available models:');
      models.forEach((model: { name: string }) => {
        console.warn(`- ${model.name}`);
      });

      if (process.argv.indexOf('test-connection') !== -1) {
        return false;
      }
    }

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        console.error(
          `Error: Could not connect to Ollama at ${config.ollama.apiUrl}`
        );
        console.error('Make sure Ollama is running and accessible.');
      } else {
        console.error(`Error connecting to Ollama API: ${error.message}`);
      }
    } else {
      console.error('Unknown error testing Ollama connection:', error);
    }
    return false;
  }
}
