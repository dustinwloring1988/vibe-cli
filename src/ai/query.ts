/**
 * Interfaces for AI communication
 */
import axios from 'axios';
import { config } from '../config';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Message callback for streaming responses
 */
export type MessageCallback = (content: string, isDone: boolean) => void;

/**
 * Error that occurred during AI query
 */
export class AIQueryError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AIQueryError';
  }
}

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
  // Use the placeholder implementation if we're not in a production environment
  if (process.env.NODE_ENV === 'test') {
    return mockQueryAI(messages, onUpdate);
  }

  try {
    const { apiUrl, model } = config.ollama;
    const endpoint = `${apiUrl}/chat`;

    // Format messages for Ollama API
    const requestData = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
    };

    // Make streaming request to Ollama API
    const response = await axios.post(endpoint, requestData, {
      responseType: 'stream',
    });

    let fullResponse = '';

    return new Promise((resolve, reject) => {
      // Handle the stream data
      response.data.on('data', (chunk: Buffer) => {
        try {
          // Each chunk may contain multiple JSON objects
          const chunkString = chunk.toString();

          // Split by newlines and process each event
          const events = chunkString.split('\n').filter(Boolean);

          for (const event of events) {
            try {
              const data = JSON.parse(event);

              if (data.error) {
                throw new Error(data.error);
              }

              // Get the message content
              const content = data.message?.content || '';

              if (content) {
                fullResponse += content;
                if (onUpdate) {
                  onUpdate(content, false);
                }
              }

              // Check if this is the last message
              if (data.done) {
                if (onUpdate) {
                  onUpdate('', true);
                }
                resolve(fullResponse);
              }
            } catch (parseError) {
              console.error('Error parsing JSON from stream:', parseError);
              // Continue processing other events
            }
          }
        } catch (error) {
          reject(
            new AIQueryError('Error processing stream data', error as Error)
          );
        }
      });

      // Handle stream errors
      response.data.on('error', (error: Error) => {
        reject(new AIQueryError('Stream error', error));
      });

      // Handle stream end without done: true
      response.data.on('end', () => {
        if (fullResponse) {
          if (onUpdate) {
            onUpdate('', true);
          }
          resolve(fullResponse);
        } else {
          reject(new AIQueryError('Stream ended without response'));
        }
      });
    });
  } catch (error) {
    // Handle API request errors
    if (axios.isAxiosError(error)) {
      throw new AIQueryError(`API request failed: ${error.message}`, error);
    }
    throw new AIQueryError('Unknown error during API request', error as Error);
  }
}

/**
 * Mock implementation for testing
 */
function mockQueryAI(
  messages: Message[],
  onUpdate?: MessageCallback
): Promise<string> {
  return new Promise(resolve => {
    let fullResponse = '';
    const dummyResponse =
      'This is a simulated AI response for testing purposes. The actual integration with Ollama API is used in production.';

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
