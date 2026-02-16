import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4096, jsonMode = false } = options;
  const anthropic = getClient();

  const system = jsonMode
    ? `${systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not wrap your response in markdown code fences or add any text before/after the JSON.`
    : systemPrompt;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';

  // Strip markdown fences and extract JSON if present
  if (jsonMode) {
    let cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    // If the response doesn't start with { or [, try to extract JSON from it
    if (cleaned && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
      const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      }
    }
    return cleaned;
  }

  return text;
}

export async function generateStructuredContent<T>(
  systemPrompt: string,
  userPrompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const content = await generateCompletion(systemPrompt, userPrompt, {
      ...options,
      jsonMode: true,
    });

    try {
      return JSON.parse(content) as T;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        console.warn(`[anthropic] JSON parse failed (attempt ${attempt + 1}), retrying...`);
        continue;
      }
      // Last attempt: aggressive JSON repair
      try {
        let fixed = content;
        // Remove trailing commas
        fixed = fixed.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        // Remove control chars except newline/tab
        fixed = fixed.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
        // If truncated (missing closing braces), try to close them
        const openBraces = (fixed.match(/{/g) || []).length;
        const closeBraces = (fixed.match(/}/g) || []).length;
        if (openBraces > closeBraces) {
          // Truncate to last complete value, then close
          const lastGoodComma = fixed.lastIndexOf('",');
          if (lastGoodComma > 0) {
            fixed = fixed.slice(0, lastGoodComma + 1);
          }
          for (let i = 0; i < openBraces - closeBraces; i++) {
            fixed += '}';
          }
        }
        const openBrackets = (fixed.match(/\[/g) || []).length;
        const closeBrackets = (fixed.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          for (let i = 0; i < openBrackets - closeBrackets; i++) {
            fixed += ']';
          }
        }
        return JSON.parse(fixed) as T;
      } catch {
        throw err;
      }
    }
  }

  throw new Error('Unreachable');
}
