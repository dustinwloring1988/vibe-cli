#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Repl } from '../repl';
import { startAgentRepl } from '../agent';
import { queryAI, Message, AIQueryError } from '../ai/query';
import { validateConfig, config, initializeConfig } from '../config';
import { initializeTools } from '../tools';
import { handleConfigCommand } from './config-cmd';
import { handleSessionCommand } from './session-cmd';
import { sessionManager } from '../session';

/**
 * Main CLI entry point for vibe-cli
 */
async function main(): Promise<void> {
  // Initialize configuration and session
  await initializeConfig();
  await sessionManager.initialize();

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
      yargs => {
        return yargs
          .option('personality', {
            type: 'string',
            describe: 'Personality of the AI assistant',
            choices: ['helpful', 'concise', 'detailed', 'teaching'],
            default: 'helpful',
          })
          .option('verbosity', {
            type: 'string',
            describe: 'Verbosity level of the AI assistant',
            choices: ['low', 'medium', 'high'],
            default: 'medium',
          })
          .option('markdown', {
            type: 'boolean',
            describe: 'Whether to use markdown formatting in responses',
            default: true,
          })
          .option('debug', {
            alias: 'd',
            type: 'boolean',
            describe: 'Enable debug mode',
            default: false,
          });
      },
      async argv => {
        console.log('Starting agent session with tools...');
        console.log(`Using model: ${config.ollama.model}`);
        console.log(`Personality: ${argv.personality}`);
        console.log(`Verbosity: ${argv.verbosity}`);
        console.log(`Markdown: ${argv.markdown ? 'enabled' : 'disabled'}`);

        // Store the options in the config for the agent to use
        config.agent = {
          personality: argv.personality as string,
          verbosity: argv.verbosity as string,
          useMarkdown: argv.markdown as boolean,
        };

        await startAgentRepl();
      }
    )
    .command(
      'config',
      'Manage vibe-cli configuration',
      yargs => {
        return yargs
          .option('action', {
            type: 'string',
            describe: 'Action to perform',
            choices: ['view', 'edit', 'reset', 'path'],
            default: 'view',
          })
          .option('property', {
            type: 'string',
            describe: 'Configuration property path (e.g. "ollama.apiUrl")',
          })
          .option('value', {
            type: 'string',
            describe: 'New value for the property',
          })
          .option('editor', {
            type: 'boolean',
            describe: 'Open configuration in editor',
            default: false,
          })
          .example('$0 config', 'View entire configuration')
          .example(
            '$0 config --action view --property ollama.apiUrl',
            'View specific configuration value'
          )
          .example(
            '$0 config --action edit --property ollama.apiUrl --value http://localhost:11434/api',
            'Set configuration value'
          )
          .example(
            '$0 config --action edit --editor',
            'Edit configuration in text editor'
          )
          .example(
            '$0 config --action reset',
            'Reset configuration to defaults'
          )
          .example('$0 config --action path', 'Show configuration file path');
      },
      async args => {
        await handleConfigCommand(args);
      }
    )
    .command(
      'session',
      'Manage vibe-cli sessions',
      yargs => {
        return yargs
          .option('action', {
            type: 'string',
            describe: 'Action to perform',
            choices: ['info', 'list-backups', 'restore', 'clear', 'backup'],
            default: 'info',
          })
          .option('path', {
            type: 'string',
            describe: 'Path to session backup file (for restore action)',
          })
          .example('$0 session', 'Show current session information')
          .example(
            '$0 session --action list-backups',
            'List available session backups'
          )
          .example(
            '$0 session --action restore --path <backup-path>',
            'Restore session from backup'
          )
          .example('$0 session --action clear', 'Clear conversation history')
          .example(
            '$0 session --action backup',
            'Create a backup of the current session'
          );
      },
      async args => {
        await handleSessionCommand(args);
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
      'For more information, visit https://github.com/dustinwloring1988/vibe-cli'
    )
    .parse();
}

// Handle cleanup for graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  sessionManager.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  sessionManager.close();
  process.exit(0);
});

// Handle errors
process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error);
  sessionManager.close();
  process.exit(1);
});

// Run the CLI
main().catch(error => {
  console.error('Error:', error);
  sessionManager.close();
  process.exit(1);
});
