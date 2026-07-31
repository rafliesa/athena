export type InputRecord = Record<string, unknown>;

export function parseToolInput(input: unknown, allowedProperties: readonly string[]): InputRecord {
  if (!isRecord(input)) throw new Error('Tool input must be an object.');

  const allowed = new Set(allowedProperties);
  const unknownProperty = Object.keys(input).find((property) => !allowed.has(property));
  if (unknownProperty) {
    throw new Error(`Unknown input property: "${unknownProperty}".`);
  }

  return input;
}

export function readString(
  input: InputRecord,
  property: string,
  options: { allowEmpty?: boolean; maximumLength?: number } = {},
): string {
  const value = input[property];
  if (typeof value !== 'string' || (!options.allowEmpty && value.trim().length === 0)) {
    const qualifier = options.allowEmpty ? 'a string' : 'a non-empty string';
    throw new Error(`"${property}" must be ${qualifier}.`);
  }
  if (options.maximumLength !== undefined && value.length > options.maximumLength) {
    throw new Error(`"${property}" must contain at most ${options.maximumLength} characters.`);
  }
  return value;
}

export function readBoolean(input: InputRecord, property: string): boolean {
  const value = input[property];
  if (typeof value !== 'boolean') {
    throw new Error(`"${property}" must be a boolean.`);
  }
  return value;
}

export function readInteger(
  input: InputRecord,
  property: string,
  minimum: number,
  maximum: number,
): number {
  const value = input[property];
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error(`"${property}" must be an integer from ${minimum} to ${maximum}.`);
  }
  return Number(value);
}

export function readNullableInteger(
  input: InputRecord,
  property: string,
  minimum: number,
  maximum: number,
): number | null {
  if (input[property] === null) return null;
  return readInteger(input, property, minimum, maximum);
}

export function readStringArray(
  input: InputRecord,
  property: string,
  maximumItems: number,
  maximumItemLength: number,
): string[] {
  const value = input[property];
  if (!Array.isArray(value) || value.length > maximumItems) {
    throw new Error(`"${property}" must be an array containing at most ${maximumItems} strings.`);
  }
  if (value.some((item) => typeof item !== 'string' || item.length > maximumItemLength)) {
    throw new Error(
      `Every "${property}" item must be a string containing at most ${maximumItemLength} characters.`,
    );
  }
  return value as string[];
}

function isRecord(value: unknown): value is InputRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
