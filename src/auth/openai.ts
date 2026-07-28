export async function validateApiKey(apiKey: string): Promise<void> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`API key validation failed (${response.status}).`);
  }
}
