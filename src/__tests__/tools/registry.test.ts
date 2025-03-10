import { ToolRegistry } from '../../tools/registry';
import { BaseTool, ToolResult } from '../../tools/interface';

// Mock the config module
jest.mock('../../config', () => ({
  config: {
    app: {
      debug: false
    }
  }
}));

// Mock the logger module
jest.mock('../../logging', () => ({
  logger: {
    error: jest.fn(),
    logToolExecution: jest.fn()
  }
}));

// Mock tool for testing
class MockTool extends BaseTool {
  name = 'mock-tool';
  description = 'A mock tool for testing';

  async execute(args: { shouldSucceed?: boolean; data?: unknown }): Promise<ToolResult> {
    if (args.shouldSucceed === false) {
      return this.failure('Mock tool failure');
    }
    return this.success(args.data || 'Mock tool success');
  }
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;
  let mockTool: MockTool;

  beforeEach(() => {
    registry = new ToolRegistry();
    mockTool = new MockTool();
  });

  test('should register a tool', () => {
    registry.register(mockTool);
    expect(registry.has('mock-tool')).toBe(true);
    expect(registry.get('mock-tool')).toBe(mockTool);
  });

  test('should get all registered tools', () => {
    registry.register(mockTool);
    const tools = registry.getAll();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toBe(mockTool);
  });

  test('should execute a tool successfully', async () => {
    registry.register(mockTool);
    const result = await registry.execute('mock-tool', { data: 'test-data' });
    expect(result).toBe('test-data');
  });

  test('should throw an error when executing a non-existent tool', async () => {
    await expect(registry.execute('non-existent-tool')).rejects.toThrow(
      'Tool "non-existent-tool" not found'
    );
  });

  test('should throw an error when tool execution fails', async () => {
    registry.register(mockTool);
    await expect(registry.execute('mock-tool', { shouldSucceed: false })).rejects.toThrow(
      'Mock tool failure'
    );
  });
}); 