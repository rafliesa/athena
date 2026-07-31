export type AgentPermissions = {
  canEditFiles: boolean;
  canRunCommands: boolean;
};

export const DEFAULT_AGENT_PERMISSIONS: Readonly<AgentPermissions> = {
  canEditFiles: true,
  canRunCommands: false,
};

export function resolveAgentPermissions(permissions?: AgentPermissions): AgentPermissions {
  return { ...(permissions ?? DEFAULT_AGENT_PERMISSIONS) };
}

export function formatAgentPermissions(permissions: AgentPermissions): string {
  return [
    `Edit files: ${formatPermission(permissions.canEditFiles)}`,
    `Run terminal: ${formatPermission(permissions.canRunCommands)}`,
  ].join('\n');
}

function formatPermission(enabled: boolean): string {
  return enabled ? 'allowed' : 'blocked';
}
