import { ListDirTool } from '../../../tools/filesystem/list-dir.js';
import fs from 'fs/promises';
import path from 'path';

// Mock fs.readdir and fs.stat
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

describe('ListDirTool', () => {
  let listDirTool: ListDirTool;
  const mockDirPath = '/mock/directory';
  const resolvedMockDirPath = path.resolve(mockDirPath);

  beforeEach(() => {
    listDirTool = new ListDirTool();
    jest.clearAllMocks();
  });

  test('should return an error if path is not provided', async () => {
    const result = await listDirTool.execute({} as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Path is required');
  });

  test('should return an error if path is not a directory', async () => {
    // Mock fs.stat to return a non-directory
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => false,
    });

    const result = await listDirTool.execute({ path: mockDirPath });
    expect(result.success).toBe(false);
    expect(result.error).toBe(`Path ${resolvedMockDirPath} is not a directory`);
  });

  test('should return an error if directory does not exist', async () => {
    // Mock fs.stat to throw an error
    (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const result = await listDirTool.execute({ path: mockDirPath });
    expect(result.success).toBe(false);
    expect(result.error).toBe(`Directory not found: ${resolvedMockDirPath}`);
  });

  test('should list files and directories successfully', async () => {
    // Mock fs.stat to return a directory
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
    });

    // Mock fs.readdir to return some files and directories
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'file1.txt', isDirectory: () => false, isFile: () => true },
      { name: 'file2.txt', isDirectory: () => false, isFile: () => true },
      { name: 'dir1', isDirectory: () => true, isFile: () => false },
      { name: 'dir2', isDirectory: () => true, isFile: () => false },
    ]);

    const result = await listDirTool.execute({ path: mockDirPath });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      path: resolvedMockDirPath,
      files: ['file1.txt', 'file2.txt'],
      directories: ['dir1', 'dir2'],
    });
  });

  test('should handle errors during directory reading', async () => {
    // Mock fs.stat to return a directory
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
    });

    // Mock fs.readdir to throw an error
    (fs.readdir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

    const result = await listDirTool.execute({ path: mockDirPath });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Error listing directory: Permission denied');
  });
}); 