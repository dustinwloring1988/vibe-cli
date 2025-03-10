#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Repl } from '../repl';
import { queryAI, Message } from '../ai/query';

/**
 * Main CLI entry point for vibe-cli
 */
async function main(): Promise<void> {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <command> [options]')
    .command(
      'chat',
      'Start an interactive chat with the AI assistant',
      {},
      async () => {
        console.log('Starting interactive chat session...');
        const repl = new Repl();
        await repl.start();
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
      },
      async argv => {
        console.log(`Querying AI with prompt: ${argv.prompt}`);

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

        // Stream the response to the console
        let responseText = '';
        await queryAI(messages, (content, isDone) => {
          process.stdout.write(content);
          responseText += content;
        });

        console.log('\n');
      }
    )
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
