import OpenAI from 'openai';

let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4096, jsonMode = false } = options;
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    ...(jsonMode && { response_format: { type: 'json_object' } }),
  });

  return response.choices[0]?.message?.content || '';
}

export async function generateStructuredContent<T>(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const content = await generateCompletion(systemPrompt, userPrompt, {
    ...options,
    jsonMode: true,
  });

  return JSON.parse(content) as T;
}
