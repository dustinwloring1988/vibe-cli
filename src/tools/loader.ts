import path from 'path';
import { toolRegistry } from './registry';
import { ListDirTool } from './filesystem/list-dir';
import { ReadFileTool } from './filesystem/read-file';
import { LoadInstructionsTool } from './filesystem/load-instructions';

/**
 * Initialize the tool system and load all available tools
 */
export async function initializeTools(): Promise<void> {
  try {
    // Register file system tools
    const listDirTool = new ListDirTool();
    const readFileTool = new ReadFileTool();
    const loadInstructionsTool = new LoadInstructionsTool();

    console.log(
      `Registering tool: ${listDirTool.name} - ${listDirTool.description}`
    );
    toolRegistry.register(listDirTool);

    console.log(
      `Registering tool: ${readFileTool.name} - ${readFileTool.description}`
    );
    toolRegistry.register(readFileTool);

    console.log(
      `Registering tool: ${loadInstructionsTool.name} - ${loadInstructionsTool.description}`
    );
    toolRegistry.register(loadInstructionsTool);

    // Log registered tools for debugging
    const tools = toolRegistry.getAll();
    console.log(`Loaded ${tools.length} tools:`);
    tools.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool.name}: ${tool.description}`);
    });
  } catch (error) {
    console.error('Error initializing tools:', error);
  }
}
