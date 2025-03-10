/**
 * Configuration for the agent system prompt
 */

/**
 * Personality traits for the AI
 */
export enum AIPersonality {
  HELPFUL = 'helpful',
  CONCISE = 'concise',
  DETAILED = 'detailed',
  TEACHING = 'teaching',
}

/**
 * Verbosity levels for the AI
 */
export enum AIVerbosity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Configuration for the agent system prompt
 */
export interface AgentPromptConfig {
  /**
   * Personality of the AI
   */
  personality: AIPersonality;

  /**
   * Verbosity level of the AI
   */
  verbosity: AIVerbosity;

  /**
   * Whether the AI should use full markdown formatting
   */
  useMarkdown: boolean;

  /**
   * Whether to include detailed tool usage guidelines
   */
  includeToolGuidelines: boolean;

  /**
   * Additional custom instructions
   */
  customInstructions?: string;
}

/**
 * Default configuration for the agent system prompt
 */
export const defaultAgentPromptConfig: AgentPromptConfig = {
  personality: AIPersonality.HELPFUL,
  verbosity: AIVerbosity.MEDIUM,
  useMarkdown: true,
  includeToolGuidelines: true,
};

/**
 * Get personality description based on the configured personality
 * @param personality The personality to get a description for
 * @returns A string describing the personality
 */
export function getPersonalityDescription(personality: AIPersonality): string {
  switch (personality) {
    case AIPersonality.HELPFUL:
      return 'You are a helpful AI coding assistant. You provide accurate, useful information and assistance with coding tasks.';
    case AIPersonality.CONCISE:
      return 'You are a concise AI coding assistant. You provide brief, to-the-point answers and solutions. You avoid unnecessary explanations.';
    case AIPersonality.DETAILED:
      return 'You are a detailed AI coding assistant. You provide comprehensive explanations and thorough analyses of code. You include relevant context and educational information.';
    case AIPersonality.TEACHING:
      return 'You are a teaching-focused AI coding assistant. You explain concepts thoroughly and provide educational context. You focus on helping users learn, not just solving their immediate problem.';
    default:
      return 'You are a helpful AI coding assistant.';
  }
}

/**
 * Get verbosity guidelines based on the configured verbosity
 * @param verbosity The verbosity level to get guidelines for
 * @returns A string describing the verbosity guidelines
 */
export function getVerbosityGuidelines(verbosity: AIVerbosity): string {
  switch (verbosity) {
    case AIVerbosity.LOW:
      return 'Provide concise responses. Focus on direct answers without elaboration. Use minimal explanations.';
    case AIVerbosity.MEDIUM:
      return 'Balance detail and brevity. Provide enough context to be helpful, but avoid unnecessary verbosity.';
    case AIVerbosity.HIGH:
      return 'Provide detailed explanations with thorough context. Include examples where helpful. Elaborate on important concepts.';
    default:
      return 'Balance detail and brevity in your responses.';
  }
}

/**
 * Get formatting guidelines based on the configuration
 * @param useMarkdown Whether to use markdown formatting
 * @returns A string describing the formatting guidelines
 */
export function getFormattingGuidelines(useMarkdown: boolean): string {
  if (useMarkdown) {
    return 'Use markdown formatting to enhance your responses. Format code blocks with appropriate language tags. Use headings, lists, and emphasis to improve readability.';
  }
  return 'Use simple formatting for your responses. Use code blocks for code snippets. Use clear structure to improve readability.';
}
