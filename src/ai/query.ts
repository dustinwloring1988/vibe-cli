/**
 * Interfaces for AI communication
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Message callback for streaming responses
 */
export type MessageCallback = (content: string, isDone: boolean) => void;

/**
 * Query the AI with a set of messages and stream back the response
 * @param messages Array of messages to send to the AI
 * @param onUpdate Callback function for streaming responses
 * @returns Promise resolving to the full AI response
 */
export async function queryAI(
  messages: Message[],
  onUpdate?: MessageCallback
): Promise<string> {
  // This is a placeholder implementation until we integrate with Ollama API
  return new Promise(resolve => {
    let fullResponse = '';
    const dummyResponse =
      'This is a simulated AI response for testing purposes. The actual integration with Ollama API will be implemented later.';

    // Simulate streaming by sending one character at a time
    let index = 0;

    // If no callback is provided, just return the full response
    if (!onUpdate) {
      resolve(dummyResponse);
      return;
    }

    const interval = setInterval(() => {
      if (index < dummyResponse.length) {
        const char = dummyResponse[index];
        fullResponse += char;
        onUpdate(char, false);
        index++;
      } else {
        clearInterval(interval);
        onUpdate('', true);
        resolve(fullResponse);
      }
    }, 30); // Simulate typing speed
  });
}
