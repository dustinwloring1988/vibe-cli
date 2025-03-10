import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { Config, PartialConfig } from './config';

/**
 * Configuration validation error details
 */
export interface ConfigValidationError {
  path: string;
  message: string;
}

/**
 * Global configuration management options
 */
export interface ConfigManagerOptions {
  /**
   * Path to the configuration file
   * Defaults to ~/.viberc.json
   */
  configPath?: string;

  /**
   * Whether to create the config file if it doesn't exist
   * Defaults to true
   */
  createIfMissing?: boolean;
}

/**
 * Manager for handling global configuration persistence
 */
export class ConfigManager {
  private configPath: string;
  private createIfMissing: boolean;
  private config: Config | null = null;
  private static instance: ConfigManager;

  /**
   * Create a new configuration manager
   * @param options Configuration options
   */
  private constructor(options?: ConfigManagerOptions) {
    this.configPath =
      options?.configPath || path.join(os.homedir(), '.viberc.json');
    this.createIfMissing = options?.createIfMissing ?? true;
  }

  /**
   * Get the singleton instance of the configuration manager
   * @param options Configuration options
   * @returns ConfigManager instance
   */
  public static getInstance(options?: ConfigManagerOptions): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(options);
    }
    return ConfigManager.instance;
  }

  /**
   * Initialize the configuration manager
   * This will load the configuration from disk
   * @returns True if configuration was loaded successfully
   */
  public async initialize(): Promise<boolean> {
    try {
      return await this.loadConfig();
    } catch (error) {
      console.error('Error initializing config manager:', error);
      return false;
    }
  }

  /**
   * Load configuration from disk
   * @returns True if configuration was loaded successfully
   */
  private async loadConfig(): Promise<boolean> {
    try {
      const fileExists = await this.fileExists(this.configPath);

      if (!fileExists) {
        if (this.createIfMissing) {
          // Config doesn't exist, generate default configuration
          console.log(
            `Config file not found at ${this.configPath}. Creating default configuration.`
          );
          await this.saveConfig();
          return true;
        }
        console.warn(
          `Config file not found at ${this.configPath} and createIfMissing is false.`
        );
        return false;
      }

      // Read and parse config file
      const data = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(data);

      // Validate the loaded config
      const validationErrors = this.validateConfig(this.config);
      if (validationErrors.length > 0) {
        console.warn('Configuration validation errors:');
        validationErrors.forEach(error => {
          console.warn(`- ${error.path}: ${error.message}`);
        });

        console.warn('Falling back to default configuration.');
        this.config = null;
        return false;
      }

      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Config file not found at ${this.configPath}`);
        return false;
      }

      console.error('Error loading configuration:', error);
      return false;
    }
  }

  /**
   * Save configuration to disk
   * @param config Configuration to save (uses current config if not provided)
   * @returns True if configuration was saved successfully
   */
  public async saveConfig(config?: Config): Promise<boolean> {
    try {
      // Use provided config or current config (or default if neither exists)
      const configToSave = config || this.config || this.getDefaultConfig();

      // Create directory if it doesn't exist
      const dir = path.dirname(this.configPath);
      await fs.mkdir(dir, { recursive: true });

      // Write config to file
      await fs.writeFile(
        this.configPath,
        JSON.stringify(configToSave, null, 2),
        'utf8'
      );

      // Update current config
      this.config = configToSave;

      return true;
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    }
  }

  /**
   * Get the current configuration
   * @returns Current configuration or null if not loaded
   */
  public getConfig(): Config | null {
    return this.config;
  }

  /**
   * Update configuration with new values
   * @param newConfig New configuration values (partial)
   * @param save Whether to save the updated configuration to disk
   * @returns Updated configuration
   */
  public async updateConfig(
    newConfig: PartialConfig,
    save = true
  ): Promise<Config> {
    // Create new config by merging current config with new values
    const updated = this.mergeConfigs(
      this.config || this.getDefaultConfig(),
      newConfig
    );

    // Save to disk if requested
    if (save) {
      await this.saveConfig(updated);
    }

    // Update current config
    this.config = updated;

    return updated;
  }

  /**
   * Reset configuration to default values
   * @param save Whether to save the default configuration to disk
   * @returns Default configuration
   */
  public async resetConfig(save = true): Promise<Config> {
    const defaultConfig = this.getDefaultConfig();

    if (save) {
      await this.saveConfig(defaultConfig);
    }

    this.config = defaultConfig;

    return defaultConfig;
  }

  /**
   * Merge two configurations, with the second one taking precedence
   * @param base Base configuration
   * @param overlay Overlay configuration (partial)
   * @returns Merged configuration
   */
  private mergeConfigs(base: Config, overlay: PartialConfig): Config {
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

    // Merge prompt config (with nested objects)
    if (overlay.prompt) {
      if (overlay.prompt.style) {
        result.prompt.style = overlay.prompt.style;
      }

      // Merge nested prompt.colors
      if (overlay.prompt.colors) {
        result.prompt.colors = {
          ...result.prompt.colors,
          ...overlay.prompt.colors,
        };
      }

      // Merge nested prompt.symbols
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
   * Validate configuration structure and values
   * @param config Configuration to validate
   * @returns Array of validation errors
   */
  private validateConfig(config: unknown): ConfigValidationError[] {
    const errors: ConfigValidationError[] = [];

    if (!config || typeof config !== 'object') {
      errors.push({
        path: 'root',
        message: 'Configuration must be an object',
      });
      return errors;
    }

    const typedConfig = config as Record<string, unknown>;

    // Validate ollama config
    if (!typedConfig.ollama || typeof typedConfig.ollama !== 'object') {
      errors.push({
        path: 'ollama',
        message: 'Missing or invalid ollama configuration',
      });
    } else {
      const ollama = typedConfig.ollama as Record<string, unknown>;

      if (!ollama.apiUrl || typeof ollama.apiUrl !== 'string') {
        errors.push({
          path: 'ollama.apiUrl',
          message: 'Missing or invalid API URL',
        });
      }

      if (!ollama.model || typeof ollama.model !== 'string') {
        errors.push({
          path: 'ollama.model',
          message: 'Missing or invalid model name',
        });
      }
    }

    // Validate app config
    if (!typedConfig.app || typeof typedConfig.app !== 'object') {
      errors.push({
        path: 'app',
        message: 'Missing or invalid app configuration',
      });
    } else {
      const app = typedConfig.app as Record<string, unknown>;

      if (
        app.logLevel &&
        !['debug', 'info', 'warn', 'error'].includes(app.logLevel as string)
      ) {
        errors.push({
          path: 'app.logLevel',
          message: 'Log level must be one of: debug, info, warn, error',
        });
      }

      if (app.debug !== undefined && typeof app.debug !== 'boolean') {
        errors.push({
          path: 'app.debug',
          message: 'Debug flag must be a boolean',
        });
      }
    }

    // Validate agent config (optional)
    if (typedConfig.agent !== undefined) {
      if (typeof typedConfig.agent !== 'object') {
        errors.push({
          path: 'agent',
          message: 'Agent configuration must be an object',
        });
      } else {
        const agent = typedConfig.agent as Record<string, unknown>;

        if (
          agent.personality !== undefined &&
          typeof agent.personality !== 'string'
        ) {
          errors.push({
            path: 'agent.personality',
            message: 'Agent personality must be a string',
          });
        }

        if (
          agent.verbosity !== undefined &&
          typeof agent.verbosity !== 'string'
        ) {
          errors.push({
            path: 'agent.verbosity',
            message: 'Agent verbosity must be a string',
          });
        }

        if (
          agent.useMarkdown !== undefined &&
          typeof agent.useMarkdown !== 'boolean'
        ) {
          errors.push({
            path: 'agent.useMarkdown',
            message: 'Agent useMarkdown flag must be a boolean',
          });
        }
      }
    }

    // Validate prompt config (optional)
    if (typedConfig.prompt !== undefined) {
      if (typeof typedConfig.prompt !== 'object') {
        errors.push({
          path: 'prompt',
          message: 'Prompt configuration must be an object',
        });
      } else {
        const prompt = typedConfig.prompt as Record<string, unknown>;

        if (
          prompt.style !== undefined &&
          !['default', 'emoji', 'minimal', 'detailed'].includes(
            prompt.style as string
          )
        ) {
          errors.push({
            path: 'prompt.style',
            message:
              'Prompt style must be one of: default, emoji, minimal, detailed',
          });
        }

        // Validate colors (optional)
        if (prompt.colors !== undefined) {
          if (typeof prompt.colors !== 'object') {
            errors.push({
              path: 'prompt.colors',
              message: 'Prompt colors must be an object',
            });
          }
        }

        // Validate symbols (optional)
        if (prompt.symbols !== undefined) {
          if (typeof prompt.symbols !== 'object') {
            errors.push({
              path: 'prompt.symbols',
              message: 'Prompt symbols must be an object',
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Check if a file exists
   * @param filePath Path to the file
   * @returns True if the file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get default configuration
   * @returns Default configuration
   */
  private getDefaultConfig(): Config {
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

  /**
   * Get the path to the configuration file
   * @returns Path to the configuration file
   */
  public getConfigPath(): string {
    return this.configPath;
  }
}
