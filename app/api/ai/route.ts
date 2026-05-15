import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';
import type { AIProvider } from '@/lib/ai-provider';

interface RequestBody {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const { provider, systemPrompt, userMessage, temperature, maxTokens, responseFormat } = body;

  if (!provider || !systemPrompt || !userMessage) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await callAI({ provider, systemPrompt, userMessage, temperature, maxTokens, responseFormat });

  return NextResponse.json({
    content: result.content,
    provider: result.provider,
    ...(result.error ? { error: result.error } : {}),
  });
}
