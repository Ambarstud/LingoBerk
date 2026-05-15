export type AIProvider = 'claude' | 'gpt' | 'gemini';

export interface AIRequest {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  tokensUsed?: number;
  error?: string;
}

export async function callAI(request: AIRequest): Promise<AIResponse> {
  const {
    provider,
    systemPrompt,
    userMessage,
    temperature = 0.7,
    maxTokens = 1000,
    responseFormat = 'text',
  } = request;

  const finalSystemPrompt =
    responseFormat === 'json'
      ? `${systemPrompt}\n\nIMPORTANT: Return valid JSON only. No markdown, no explanation outside the JSON.`
      : systemPrompt;

  try {
    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: 'API key not configured. Add it to .env.local' };
      }

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: maxTokens,
          temperature,
          system: finalSystemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        return { content: '', provider, error: `Claude API error: ${res.status} ${err}` };
      }

      interface ClaudeResponse {
        content: Array<{ type: string; text: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      }
      const data = (await res.json()) as ClaudeResponse;
      const content = data.content?.[0]?.text ?? '';
      const tokensUsed = data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined;
      return { content, provider, tokensUsed };
    }

    if (provider === 'gpt') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: 'API key not configured. Add it to .env.local' };
      }

      const body: Record<string, unknown> = {
        model: 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userMessage },
        ],
      };

      if (responseFormat === 'json') {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { content: '', provider, error: `GPT API error: ${res.status} ${err}` };
      }

      interface GPTResponse {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      }
      const data = (await res.json()) as GPTResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      const tokensUsed = data.usage?.total_tokens;
      return { content, provider, tokensUsed };
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: 'API key not configured. Add it to .env.local' };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: finalSystemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
              ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        return { content: '', provider, error: `Gemini API error: ${res.status} ${err}` };
      }

      interface GeminiResponse {
        candidates?: Array<{ content: { parts: Array<{ text: string }> } }>;
        usageMetadata?: { totalTokenCount: number };
      }
      const data = (await res.json()) as GeminiResponse;
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const tokensUsed = data.usageMetadata?.totalTokenCount;
      return { content, provider, tokensUsed };
    }

    return { content: '', provider, error: 'Unknown provider' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { content: '', provider, error: message };
  }
}
