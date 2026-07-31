import type { AgentPermissions } from '../domain/permissions.js';
import { editFileTool } from './filesystem/editFile/index.js';
import { findFilesTool } from './filesystem/findFiles/index.js';
import { readFileTool } from './filesystem/readFile/index.js';
import { scanDirectoryTool } from './filesystem/scanDirectory/index.js';
import { searchTextTool } from './filesystem/searchText/index.js';
import { writeFileTool } from './filesystem/writeFile/index.js';
import { runCommandTool } from './terminal/runCommand/index.js';
import { ToolRegistry } from './ToolRegistry.js';

const TOOLS = [
  scanDirectoryTool,
  findFilesTool,
  searchTextTool,
  readFileTool,
  writeFileTool,
  editFileTool,
  runCommandTool,
] as const;

export const toolRegistry = new ToolRegistry(TOOLS);

export function createPermissionedToolRegistry(permissions: AgentPermissions): ToolRegistry {
  return new ToolRegistry(
    TOOLS.filter((tool) => {
      switch (tool.access) {
        case 'read-only':
          return true;
        case 'workspace-write':
          return permissions.canEditFiles;
        case 'process-execution':
          return permissions.canRunCommands;
      }
    }),
  );
}
