import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';
import type { AIProvider } from '@/lib/ai-provider';
import type { GrammarExercise } from '@/lib/types';

interface RequestBody {
  topic: string;
  subtopic?: string;
  count?: number;
  provider?: AIProvider;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const { topic, subtopic, count = 5, provider = 'gemini' } = body;

  if (!topic) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 });
  }

  const systemPrompt = `You are a YDS exam grammar question generator for a Turkish student at B1-B2 level.`;

  const userMessage = `Generate ${count} grammar exercises for the topic: ${topic}${subtopic ? ` - ${subtopic}` : ''}.

Return a JSON array. Each item must be:
{
  "id": "unique string",
  "type": "gap_fill" | "sentence_completion" | "error_correction" | "sentence_rewriting",
  "topic": "${topic}",
  "question": "...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctIndex": 0-3,
  "explanation": "brief explanation of why the answer is correct"
}

Return ONLY the JSON array, no other text.`;

  const result = await callAI({
    provider,
    systemPrompt,
    userMessage,
    temperature: 0.7,
    maxTokens: 2000,
    responseFormat: 'json',
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  try {
    const raw = result.content.trim();
    const jsonStr = raw.startsWith('[') ? raw : raw.replace(/^[^[]*/, '').replace(/[^\]]*$/, '');
    const exercises = JSON.parse(jsonStr) as GrammarExercise[];
    return NextResponse.json({ exercises });
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw: result.content }, { status: 500 });
  }
}
