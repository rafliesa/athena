export const MODELS = [
  {
    id: 'gpt-5.6-luna',
    label: 'Luna',
    description: 'Fastest and lowest-cost tier',
  },
  {
    id: 'gpt-5.6-terra',
    label: 'Terra',
    description: 'Balanced cost and capability',
  },
  {
    id: 'gpt-5.6-sol',
    label: 'Sol',
    description: 'Highest-capability tier',
  },
] as const;

export type ModelId = (typeof MODELS)[number]['id'];

export const DEFAULT_MODEL: ModelId = 'gpt-5.6-luna';

export function isModelId(value: unknown): value is ModelId {
  return typeof value === 'string' && MODELS.some((model) => model.id === value);
}
