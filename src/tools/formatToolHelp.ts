import type { ToolRuntime } from './types.js';

export function formatToolHelp(runtime: ToolRuntime): string {
  const tools = runtime.list();
  if (tools.length === 0) return 'No tools are available.';

  const sections = tools.map((tool) => {
    const schema = tool.inputSchema;
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const parameters = Object.entries(properties).map(([name, definition]) => {
      const details = isRecord(definition) ? definition : {};
      const metadata = [
        formatType(details.type),
        required.has(name) ? 'required' : 'optional',
        ...formatConstraints(details),
      ];
      const description =
        typeof details.description === 'string' ? ` — ${details.description}` : '';
      return `- \`${name}\` (${metadata.join(', ')})${description}`;
    });

    return [
      `### ${tool.name} — ${tool.title}`,
      '',
      `- **Category:** ${tool.category}`,
      `- **Access:** ${tool.access}`,
      '',
      tool.description,
      '',
      '**Parameters**',
      '',
      ...(parameters.length > 0 ? parameters : ['- None']),
    ].join('\n');
  });

  return `## Available tools (${tools.length})\n\n${sections.join('\n\n')}`;
}

function formatType(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string').join(' | ');
  return 'unknown';
}

function formatConstraints(details: Record<string, unknown>): string[] {
  const constraints: string[] = [];
  if (typeof details.minimum === 'number') constraints.push(`min ${details.minimum}`);
  if (typeof details.maximum === 'number') constraints.push(`max ${details.maximum}`);
  if (typeof details.maxLength === 'number') {
    constraints.push(`max length ${details.maxLength}`);
  }
  if (typeof details.maxItems === 'number') constraints.push(`max items ${details.maxItems}`);
  if (details.default !== undefined) constraints.push(`default ${JSON.stringify(details.default)}`);
  return constraints;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
