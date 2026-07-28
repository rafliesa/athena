import type { ModelId } from '../domain/models.js';
import type { ProviderName } from '../domain/config.js';

export type TextDeltaHandler = (delta: string) => void;

export interface Provider {
  readonly name: ProviderName;
  readonly model: ModelId;
  stream(prompt: string, onDelta: TextDeltaHandler): Promise<void>;
}
