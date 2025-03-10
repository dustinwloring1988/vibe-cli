#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Repl } from '../repl';
import { startAgentRepl } from '../agent';
import { queryAI, Message, AIQueryError } from '../ai/query';
import { validateConfig, config } from '../config';
import { initializeTools } from '../tools';

/**
 * Main CLI entry point for vibe-cli
 */
async function main(): Promise<void> {
  // Validate configuration
  if (!(await validateConfig())) {
    process.exit(1);
  }

  // Initialize tools
  await initializeTools();

  // Parse command line arguments
  yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command(
      'repl',
      'Start an interactive REPL session',
      () => {},
      async () => {
        const repl = new Repl();
        await repl.start();
      }
    )
    .command(
      'agent',
      'Start an interactive session with an AI agent that can use tools',
      {},
      async () => {
        console.log('Starting agent session with tools...');
        console.log(`Using model: ${config.ollama.model}`);

        await startAgentRepl();
      }
    )
    .command(
      'query <prompt>',
      'Send a one-off query to the AI assistant',
      {
        prompt: {
          type: 'string',
          demandOption: true,
          describe: 'The prompt to send to the AI assistant',
        },
        model: {
          type: 'string',
          describe: 'The model to use for the query (defaults to config)',
          default: config.ollama.model,
        },
      },
      async argv => {
        console.log(`Querying AI with prompt: ${argv.prompt}`);
        console.log(`Using model: ${argv.model || config.ollama.model}`);

        const messages: Message[] = [
          {
            role: 'system',
            content:
              'You are a helpful AI assistant for coding tasks. Help the user with their coding questions and tasks.',
          },
          {
            role: 'user',
            content: argv.prompt as string,
          },
        ];

        console.log('\n[AI Response]:\n');

        try {
          // Stream the response to the console
          const onUpdate = (_content: string, _isDone: boolean) => {
            // Implementation not used, just for interface compatibility
          };
          await queryAI(messages, onUpdate);

          console.log('\n');
        } catch (error) {
          console.error('Error querying AI:', error);
          process.exit(1);
        }
      }
    )
    .command(
      'test-connection',
      'Test the connection to the Ollama API',
      {},
      async () => {
        console.log('Testing connection to Ollama API...');
        console.log(`API URL: ${config.ollama.apiUrl}`);
        console.log(`Model: ${config.ollama.model}`);

        try {
          const testMessage: Message[] = [
            {
              role: 'system',
              content: 'You are a helpful assistant.',
            },
            {
              role: 'user',
              content:
                'Respond with a very short message to test connectivity.',
            },
          ];

          console.log('Sending test query...');
          const response = await queryAI(testMessage);
          console.log('Response received successfully!');
          console.log(`Response: "${response}"`);
          console.log('Connection test successful!');
        } catch (error) {
          console.error('Connection test failed!');
          if (error instanceof AIQueryError) {
            console.error(`Error: ${error.message}`);
            if (error.cause) {
              console.error(`Cause: ${error.cause.message}`);
            }
          } else {
            console.error(`Unexpected error: ${error}`);
          }
          process.exit(1);
        }
      }
    )
    .command('tools', 'List all available tools', {}, () => {
      console.log('Available tools:\n');

      // Directly log the tools we know exist
      console.log(`- listDir: Lists files and directories in a directory`);
      console.log(`- readFile: Reads the content of a file`);
    })
    .option('verbose', {
      alias: 'v',
      type: 'boolean',
      description: 'Run with verbose logging',
    })
    .help()
    .alias('help', 'h')
    .version()
    .alias('version', 'V')
    .demandCommand(1, 'You need to specify a command')
    .epilog(
      'For more information, visit https://github.com/yourusername/vibe-cli'
    )
    .parse();
}

// Handle errors
process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run the CLI
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
