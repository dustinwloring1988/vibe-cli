import chalk from 'chalk';
import { config } from './config';

/**
 * Represents the state of the system that can affect the prompt display
 */
export type SystemState = 'ready' | 'busy' | 'error' | 'default';

/**
 * Prompt manager to handle customizable REPL prompts with visual indicators
 */
export class PromptManager {
  /**
   * Get the prompt string based on the current system state
   * @param state - Current system state
   * @returns Formatted prompt string
   */
  getPrompt(state: SystemState = 'default'): string {
    const { style, colors, symbols } = config.prompt || {
      style: 'default',
      colors: { default: 'blue', ready: 'green', busy: 'yellow', error: 'red' },
      symbols: { default: '>', ready: '✓', busy: '⟳', error: '✗' },
    };

    // Get the appropriate color and symbol for the current state
    const color = colors[state];
    const symbol = symbols[state];

    // Apply color to the symbol based on the current state
    const coloredSymbol = this.applyColor(symbol, color);

    // Build the final prompt based on the selected style
    return this.buildPromptByStyle(style, coloredSymbol, state);
  }

  /**
   * Apply color to text
   * @param text - Text to color
   * @param color - Color to apply
   * @returns Colored text
   */
  private applyColor(text: string, color: string): string {
    switch (color) {
      case 'red':
        return chalk.red(text);
      case 'green':
        return chalk.green(text);
      case 'yellow':
        return chalk.yellow(text);
      case 'blue':
        return chalk.blue(text);
      case 'magenta':
        return chalk.magenta(text);
      case 'cyan':
        return chalk.cyan(text);
      case 'white':
        return chalk.white(text);
      case 'gray':
        return chalk.gray(text);
      default:
        return chalk.blue(text);
    }
  }

  /**
   * Build the prompt based on the selected style
   * @param style - Prompt style
   * @param symbol - Colored state symbol
   * @param state - Current system state
   * @returns Formatted prompt string
   */
  private buildPromptByStyle(
    style: string,
    symbol: string,
    state: SystemState
  ): string {
    const modelName = config.ollama.model;

    switch (style) {
      case 'emoji':
        return `${symbol} `;
      case 'minimal':
        return `${symbol} `;
      case 'detailed':
        const stateIndicator = this.getStateLabel(state);
        return `[${modelName}][${stateIndicator}] ${symbol} `;
      case 'default':
      default:
        return `${symbol} `;
    }
  }

  /**
   * Get a human-readable label for a system state
   * @param state - System state
   * @returns Human-readable state label
   */
  private getStateLabel(state: SystemState): string {
    switch (state) {
      case 'ready':
        return chalk.green('ready');
      case 'busy':
        return chalk.yellow('busy');
      case 'error':
        return chalk.red('error');
      case 'default':
      default:
        return chalk.blue('idle');
    }
  }
}

// Export a singleton instance
export const promptManager = new PromptManager();
