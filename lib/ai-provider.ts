export type AIProvider = 'claude' | 'gpt' | 'gemini' | 'groq' | 'openrouter';

export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  imageBase64?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  history?: HistoryMessage[];
}

const GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';

const REFUSAL_MARKERS = [
  "I can't do this roleplay",
  "I need to be direct with you",
  "crosses lines I maintain",
  "I don't roleplay sexual",
  "I don't roleplay romantic",
  "I appreciate you testing",
  "I cannot engage in",
  "I'm not able to participate",
  "I must respectfully decline",
];

function isRefusal(text: string): boolean {
  return REFUSAL_MARKERS.some(m => text.includes(m));
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
    imageBase64,
    temperature = 0.7,
    maxTokens = 1000,
    responseFormat = 'text',
    history = [],
  } = request;

  const finalSystemPrompt =
    responseFormat === 'json'
      ? `${systemPrompt}\n\nIMPORTANT: Return valid JSON only. No markdown, no explanation outside the JSON.`
      : systemPrompt;

  try {
    if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: `${provider.toUpperCase()} API anahtarı ayarlanmamış. Lütfen .env.local dosyasını kontrol edin.` };
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
        return { content: '', provider, error: `${provider.toUpperCase()} API anahtarı ayarlanmamış. Lütfen .env.local dosyasını kontrol edin.` };
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
        if (res.status === 429 && err.includes('insufficient_quota')) {
          return {
            content: '',
            provider,
            error: 'OpenAI quota exceeded. Check billing or choose Claude in settings.',
          };
        }
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
        return { content: '', provider, error: `${provider.toUpperCase()} API anahtarı ayarlanmamış. Lütfen .env.local dosyasını kontrol edin.` };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `SYSTEM INSTRUCTION: ${finalSystemPrompt}\n\nUSER MESSAGE: ${userMessage}` }] }],
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
        if (res.status === 429) {
          return {
            content: '',
            provider,
            error: 'Gemini kota limitine ulaşıldı. Google AI Studio\'dan yeni bir API key alın (aistudio.google.com/apikey) veya ayarlardan başka bir sağlayıcı seçin.',
          };
        }
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

    if (provider === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: 'GROQ API anahtarı ayarlanmamış. Lütfen .env.local dosyasını kontrol edin.' };
      }

      interface GroqResponse {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      }

      const callGroq = async (model: string): Promise<{ ok: boolean; content: string; tokensUsed?: number; error?: string }> => {
        const userContent: unknown = imageBase64
          ? [
              { type: 'text', text: userMessage || 'What do you see in this image?' },
              { type: 'image_url', image_url: { url: imageBase64 } },
            ]
          : userMessage;

        const historyMessages = history.map(m => ({ role: m.role, content: m.content }));

        const body: Record<string, unknown> = {
          model,
          max_tokens: maxTokens,
          temperature,
          messages: [
            { role: 'system', content: finalSystemPrompt },
            ...historyMessages,
            { role: 'user', content: userContent },
          ],
        };

        if (responseFormat === 'json' && !imageBase64) {
          body.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.text();
          if (res.status === 429) return { ok: false, content: '', error: 'Groq rate limit aşıldı. Birkaç saniye bekleyip tekrar deneyin.' };
          return { ok: false, content: '', error: `Groq API error: ${res.status} ${err}` };
        }

        const data = (await res.json()) as GroqResponse;
        const content = data.choices?.[0]?.message?.content ?? '';
        return { ok: true, content, tokensUsed: data.usage?.total_tokens };
      };

      const primaryModel = imageBase64 ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';
      const primary = await callGroq(primaryModel);

      if (!primary.ok) return { content: '', provider, error: primary.error };

      // If primary model refused, silently retry with fallback
      if (!imageBase64 && isRefusal(primary.content)) {
        const fallback = await callGroq(GROQ_FALLBACK_MODEL);
        if (fallback.ok && fallback.content) {
          return { content: fallback.content, provider, tokensUsed: fallback.tokensUsed };
        }
      }

      return { content: primary.content, provider, tokensUsed: primary.tokensUsed };
    }

    if (provider === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return { content: '', provider, error: 'OpenRouter API anahtarı ayarlanmamış.' };
      }

      const userContent: unknown = imageBase64
        ? [
            { type: 'text', text: userMessage || 'What do you see in this image?' },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ]
        : userMessage;

      const historyMessages = history.map(m => ({ role: m.role, content: m.content }));

      const body: Record<string, unknown> = {
        model: 'neversleep/llama-3.1-lumimaid-70b',
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          ...historyMessages,
          { role: 'user', content: userContent },
        ],
      };

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://lingoberk.vercel.app',
          'X-Title': 'LingoBerk',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        return { content: '', provider, error: `OpenRouter error: ${res.status} ${err}` };
      }

      interface ORResponse {
        choices: Array<{ message: { content: string } }>;
        usage?: { total_tokens: number };
      }
      const data = (await res.json()) as ORResponse;
      const content = data.choices?.[0]?.message?.content ?? '';
      return { content, provider, tokensUsed: data.usage?.total_tokens };
    }

    return { content: '', provider, error: 'Unknown provider' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { content: '', provider, error: message };
  }
}
