import { scanDirectoryTool } from './filesystem/scanDirectory/index.js';
import { ToolRegistry } from './ToolRegistry.js';

export const toolRegistry = new ToolRegistry([scanDirectoryTool]);
