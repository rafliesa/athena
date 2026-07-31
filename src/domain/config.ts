import { DEFAULT_MODEL, isModelId, type ModelId } from './models.js';
import { DEFAULT_AGENT_PERMISSIONS, type AgentPermissions } from './permissions.js';

export const DEFAULT_SYSTEM_PROMPT = `You are an autonomous agent operating inside a local development harness.
- Phase 1: Analyze the request and existing files. Output a concise plan. Do not modify files in this phase unless explicitly asked.
- Phase 2: Execute changes incrementally using only the tools currently exposed by the harness.
- Constraint: Never hallucinate tool outputs. If a tool fails or returns an error, incorporate the error message into your next step to adjust the plan.
- Validation: Always run relevant validation or test commands before declaring success. Keep context clean and responses focused.`;

export type ApiConfig = {
  provider: 'api';
  model: ModelId;
  apiKey: string;
  systemPrompt?: string;
  permissions?: AgentPermissions;
};

export type CodexConfig = {
  provider: 'codex';
  model: ModelId;
  systemPrompt?: string;
  permissions?: AgentPermissions;
};

export type AthenaConfig = ApiConfig | CodexConfig;
export type ProviderName = AthenaConfig['provider'];

export function createApiConfig(apiKey: string): ApiConfig {
  return {
    provider: 'api',
    model: DEFAULT_MODEL,
    apiKey,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    permissions: { ...DEFAULT_AGENT_PERMISSIONS },
  };
}

export function createCodexConfig(): CodexConfig {
  return {
    provider: 'codex',
    model: DEFAULT_MODEL,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    permissions: { ...DEFAULT_AGENT_PERMISSIONS },
  };
}

export function parseConfig(value: unknown): AthenaConfig | null {
  if (!isRecord(value) || !isModelId(value.model)) return null;
  const permissions = parsePermissions(value.permissions);
  if (!permissions) return null;
  const systemPrompt =
    typeof value.systemPrompt === 'string' && value.systemPrompt.trim().length > 0
      ? value.systemPrompt
      : DEFAULT_SYSTEM_PROMPT;
  if (value.provider === 'codex') {
    return { provider: 'codex', model: value.model, systemPrompt, permissions };
  }
  if (value.provider === 'api' && typeof value.apiKey === 'string' && value.apiKey.length > 0) {
    return {
      provider: 'api',
      model: value.model,
      apiKey: value.apiKey,
      systemPrompt,
      permissions,
    };
  }
  return null;
}

function parsePermissions(value: unknown): AgentPermissions | null {
  if (value === undefined) return { ...DEFAULT_AGENT_PERMISSIONS };
  if (
    !isRecord(value) ||
    typeof value.canEditFiles !== 'boolean' ||
    typeof value.canRunCommands !== 'boolean'
  ) {
    return null;
  }
  return {
    canEditFiles: value.canEditFiles,
    canRunCommands: value.canRunCommands,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
