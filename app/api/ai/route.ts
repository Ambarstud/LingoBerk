import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';
import type { AIProvider } from '@/lib/ai-provider';

interface RequestBody {
  provider: AIProvider;
  systemPrompt: string;
  userMessage: string;
  imageBase64?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const { provider, systemPrompt, userMessage, imageBase64, temperature, maxTokens, responseFormat } = body;

  if (!provider || !systemPrompt) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await callAI({ provider, systemPrompt, userMessage, imageBase64, temperature, maxTokens, responseFormat });

  return NextResponse.json({
    content: result.content,
    provider: result.provider,
    ...(result.error ? { error: result.error } : {}),
  });
}
