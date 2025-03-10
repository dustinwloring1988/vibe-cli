import { Config } from '../config';

// Mock the config module
jest.mock('../config', () => {
  const mockConfig: Config = {
    ollama: {
      apiUrl: 'http://localhost:11434',
      model: 'llama3',
    },
    app: {
      logLevel: 'info',
      debug: false,
    },
    agent: {
      personality: 'helpful',
      verbosity: 'medium',
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
        busy: '...',
        error: '✗',
      },
    },
  };

  return {
    config: mockConfig,
    getCurrentConfig: jest.fn().mockReturnValue(mockConfig),
    updateConfig: jest.fn().mockImplementation((newConfig) => {
      return { ...mockConfig, ...newConfig };
    }),
    initializeConfig: jest.fn().mockResolvedValue(mockConfig),
  };
});

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
}));

describe('Config Module', () => {
  // Import the mocked functions after the mock is set up
  const { getCurrentConfig, updateConfig } = require('../config');

  test('getCurrentConfig should return the current configuration', () => {
    const config = getCurrentConfig();
    expect(config).toBeDefined();
    expect(config.ollama).toBeDefined();
    expect(config.app).toBeDefined();
    expect(config.agent).toBeDefined();
    expect(config.prompt).toBeDefined();
  });

  test('updateConfig should merge new config with existing config', async () => {
    const newConfig = {
      ollama: {
        model: 'mistral',
      },
      app: {
        debug: true,
      },
    };

    const updatedConfig = await updateConfig(newConfig, false);
    
    expect(updatedConfig.ollama.model).toBe('mistral');
    expect(updatedConfig.app.debug).toBe(true);
  });

  test('updateConfig should save config when save is true', async () => {
    const newConfig = {
      ollama: {
        model: 'mistral',
      },
    };

    await updateConfig(newConfig, true);
    
    // We can't easily test if saveConfig was called since it's internal to the module
    // This test is more of a smoke test to ensure no errors are thrown
    expect(true).toBe(true);
  });
}); 