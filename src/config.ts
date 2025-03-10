import dotenv from 'dotenv';
import axios from 'axios';
import { ConfigManager } from './configManager';

// Load environment variables from .env file
dotenv.config();

/**
 * Application configuration loaded from environment variables or config file
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
  agent: {
    personality: string;
    verbosity: string;
    useMarkdown: boolean;
  };
  prompt: {
    style: 'default' | 'emoji' | 'minimal' | 'detailed';
    colors: {
      default: string;
      ready: string;
      busy: string;
      error: string;
    };
    symbols: {
      default: string;
      ready: string;
      busy: string;
      error: string;
    };
  };
}

/**
 * Partial configuration with optional properties
 */
export type PartialConfig = {
  ollama?: Partial<Config['ollama']>;
  app?: Partial<Config['app']>;
  agent?: Partial<Config['agent']>;
  prompt?: Partial<{
    style?: Config['prompt']['style'];
    colors?: Partial<Config['prompt']['colors']>;
    symbols?: Partial<Config['prompt']['symbols']>;
  }>;
};

/**
 * Get configuration with environment variables taking precedence over config file
 */
export async function getConfig(): Promise<Config> {
  // Get configuration manager instance
  const configManager = ConfigManager.getInstance();

  // Initialize and load any existing configuration
  await configManager.initialize();

  // Get configuration from file or default if not found
  const fileConfig = configManager.getConfig() || getDefaultConfig();

  // Override with environment variables (environment takes precedence)
  const envConfig = getEnvConfig();

  // Merge configurations with environment taking precedence
  return mergeConfigs(fileConfig, envConfig);
}

/**
 * Merge two configurations, with the second one taking precedence
 */
function mergeConfigs(base: Config, overlay: PartialConfig): Config {
  // Deep clone the base config to avoid mutations
  const result = JSON.parse(JSON.stringify(base)) as Config;

  // Merge ollama config
  if (overlay.ollama) {
    result.ollama = {
      ...result.ollama,
      ...overlay.ollama,
    };
  }

  // Merge app config
  if (overlay.app) {
    result.app = {
      ...result.app,
      ...overlay.app,
    };
  }

  // Merge agent config
  if (overlay.agent) {
    result.agent = {
      ...result.agent,
      ...overlay.agent,
    };
  }

  // Merge prompt config
  if (overlay.prompt) {
    if (overlay.prompt.style) {
      result.prompt.style = overlay.prompt.style;
    }

    // Merge colors
    if (overlay.prompt.colors) {
      result.prompt.colors = {
        ...result.prompt.colors,
        ...overlay.prompt.colors,
      };
    }

    // Merge symbols
    if (overlay.prompt.symbols) {
      result.prompt.symbols = {
        ...result.prompt.symbols,
        ...overlay.prompt.symbols,
      };
    }
  }

  return result;
}

/**
 * Get configuration from environment variables
 */
function getEnvConfig(): PartialConfig {
  const config: PartialConfig = {};

  // Add ollama config if any values are set
  if (process.env.OLLAMA_API_URL || process.env.OLLAMA_MODEL) {
    config.ollama = {};

    if (process.env.OLLAMA_API_URL) {
      config.ollama.apiUrl = process.env.OLLAMA_API_URL;
    }

    if (process.env.OLLAMA_MODEL) {
      config.ollama.model = process.env.OLLAMA_MODEL;
    }
  }

  // Add app config if any values are set
  if (process.env.LOG_LEVEL || process.env.DEBUG) {
    config.app = {};

    if (process.env.LOG_LEVEL) {
      config.app.logLevel = process.env.LOG_LEVEL as
        | 'debug'
        | 'info'
        | 'warn'
        | 'error';
    }

    if (process.env.DEBUG) {
      config.app.debug = process.env.DEBUG === 'true';
    }
  }

  // Add agent config if any values are set
  if (
    process.env.AGENT_PERSONALITY ||
    process.env.AGENT_VERBOSITY ||
    process.env.AGENT_USE_MARKDOWN
  ) {
    config.agent = {};

    if (process.env.AGENT_PERSONALITY) {
      config.agent.personality = process.env.AGENT_PERSONALITY;
    }

    if (process.env.AGENT_VERBOSITY) {
      config.agent.verbosity = process.env.AGENT_VERBOSITY;
    }

    if (process.env.AGENT_USE_MARKDOWN) {
      config.agent.useMarkdown = process.env.AGENT_USE_MARKDOWN === 'true';
    }
  }

  // Add prompt config if any values are set
  if (
    process.env.PROMPT_STYLE ||
    process.env.PROMPT_COLOR_DEFAULT ||
    process.env.PROMPT_COLOR_READY ||
    process.env.PROMPT_COLOR_BUSY ||
    process.env.PROMPT_COLOR_ERROR ||
    process.env.PROMPT_SYMBOL_DEFAULT ||
    process.env.PROMPT_SYMBOL_READY ||
    process.env.PROMPT_SYMBOL_BUSY ||
    process.env.PROMPT_SYMBOL_ERROR
  ) {
    config.prompt = {};

    if (process.env.PROMPT_STYLE) {
      config.prompt.style = process.env.PROMPT_STYLE as
        | 'default'
        | 'emoji'
        | 'minimal'
        | 'detailed';
    }

    // Add colors if any are set
    if (
      process.env.PROMPT_COLOR_DEFAULT ||
      process.env.PROMPT_COLOR_READY ||
      process.env.PROMPT_COLOR_BUSY ||
      process.env.PROMPT_COLOR_ERROR
    ) {
      config.prompt.colors = {};

      if (process.env.PROMPT_COLOR_DEFAULT) {
        config.prompt.colors.default = process.env.PROMPT_COLOR_DEFAULT;
      }

      if (process.env.PROMPT_COLOR_READY) {
        config.prompt.colors.ready = process.env.PROMPT_COLOR_READY;
      }

      if (process.env.PROMPT_COLOR_BUSY) {
        config.prompt.colors.busy = process.env.PROMPT_COLOR_BUSY;
      }

      if (process.env.PROMPT_COLOR_ERROR) {
        config.prompt.colors.error = process.env.PROMPT_COLOR_ERROR;
      }
    }

    // Add symbols if any are set
    if (
      process.env.PROMPT_SYMBOL_DEFAULT ||
      process.env.PROMPT_SYMBOL_READY ||
      process.env.PROMPT_SYMBOL_BUSY ||
      process.env.PROMPT_SYMBOL_ERROR
    ) {
      config.prompt.symbols = {};

      if (process.env.PROMPT_SYMBOL_DEFAULT) {
        config.prompt.symbols.default = process.env.PROMPT_SYMBOL_DEFAULT;
      }

      if (process.env.PROMPT_SYMBOL_READY) {
        config.prompt.symbols.ready = process.env.PROMPT_SYMBOL_READY;
      }

      if (process.env.PROMPT_SYMBOL_BUSY) {
        config.prompt.symbols.busy = process.env.PROMPT_SYMBOL_BUSY;
      }

      if (process.env.PROMPT_SYMBOL_ERROR) {
        config.prompt.symbols.error = process.env.PROMPT_SYMBOL_ERROR;
      }
    }
  }

  return config;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): Config {
  return {
    ollama: {
      apiUrl: 'http://localhost:11434/api',
      model: 'llama3',
    },
    app: {
      logLevel: 'info',
      debug: false,
    },
    agent: {
      personality: 'helpful',
      verbosity: 'normal',
      useMarkdown: true,
    },
    prompt: {
      style: 'default',
      colors: {
        default: 'blue',
        ready: 'green',
        busy: 'yellow',
        error: 'red',
      },
      symbols: {
        default: '>',
        ready: '✓',
        busy: '⟳',
        error: '✗',
      },
    },
  };
}

// Initialize configuration
let config: Config;

/**
 * Initialize configuration
 * This needs to be called before using the config
 */
export async function initializeConfig(): Promise<void> {
  config = await getConfig();
}

/**
 * Get the current configuration
 * Will initialize if not already done
 */
export function getCurrentConfig(): Config {
  if (!config) {
    throw new Error(
      'Configuration not initialized. Call initializeConfig() first.'
    );
  }
  return config;
}

/**
 * Update configuration with new values
 * @param newConfig New configuration values (partial)
 * @param save Whether to save the updated configuration to disk
 * @returns Updated configuration
 */
export async function updateConfig(
  newConfig: PartialConfig,
  save = true
): Promise<Config> {
  // Ensure config is initialized
  if (!config) {
    await initializeConfig();
  }

  // Get configuration manager instance
  const configManager = ConfigManager.getInstance();

  // Update configuration
  if (save) {
    // Save to disk
    await configManager.updateConfig(newConfig, true);
  }

  // Update in-memory configuration
  config = mergeConfigs(config, newConfig);

  return config;
}

/**
 * Validate that the configuration is valid and the Ollama API is reachable
 */
export async function validateConfig(): Promise<boolean> {
  // Ensure config is initialized
  if (!config) {
    await initializeConfig();
  }

  // Check if the API URL is set
  if (!config.ollama.apiUrl) {
    console.error(
      'Error: OLLAMA_API_URL is not set in the environment variables or config file'
    );
    return false;
  }

  // Check if the model is set
  if (!config.ollama.model) {
    console.error(
      'Error: OLLAMA_MODEL is not set in the environment variables or config file'
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

// Export config object initially as uninitialized
// This will be initialized when initializeConfig is called
export { config };
