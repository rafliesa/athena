export type ScanDirectoryInput = {
  path: string;
  query: string | null;
  maxDepth: number;
  limit: number;
  includeHidden: boolean;
};

const INPUT_PROPERTIES = new Set<keyof ScanDirectoryInput>([
  'path',
  'query',
  'maxDepth',
  'limit',
  'includeHidden',
]);

export function parseScanDirectoryInput(input: unknown): ScanDirectoryInput {
  if (!isRecord(input)) throw new Error('Tool input must be an object.');
  const unknownProperty = Object.keys(input).find(
    (property) => !INPUT_PROPERTIES.has(property as keyof ScanDirectoryInput),
  );
  if (unknownProperty) {
    throw new Error(`Unknown input property: "${unknownProperty}".`);
  }

  const { path, query, maxDepth, limit, includeHidden } = input;
  if (typeof path !== 'string' || path.trim().length === 0) {
    throw new Error('"path" must be a non-empty string.');
  }
  if (query !== null && typeof query !== 'string') {
    throw new Error('"query" must be a string or null.');
  }
  if (!isIntegerInRange(maxDepth, 1, 8)) {
    throw new Error('"maxDepth" must be an integer from 1 to 8.');
  }
  if (!isIntegerInRange(limit, 1, 500)) {
    throw new Error('"limit" must be an integer from 1 to 500.');
  }
  if (typeof includeHidden !== 'boolean') {
    throw new Error('"includeHidden" must be a boolean.');
  }

  return { path, query, maxDepth, limit, includeHidden };
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
