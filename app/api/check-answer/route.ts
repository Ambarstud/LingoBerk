import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-provider';
import type { AIProvider } from '@/lib/ai-provider';

interface RequestBody {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  provider?: AIProvider;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RequestBody;
  const { question, userAnswer, correctAnswer, provider = 'claude' } = body;

  if (!question || !userAnswer || !correctAnswer) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const systemPrompt = `You are an English grammar tutor helping a Turkish speaker prepare for the YDS exam.`;

  const userMessage = `Question: ${question}
Their answer: ${userAnswer}
Correct answer: ${correctAnswer}

Explain in clear, simple English:
1. Why the correct answer is right (1-2 sentences)
2. Why their answer was wrong (1 sentence)
3. The grammar rule to remember (1 sentence)
4. Give one similar practice sentence with the answer

Keep it concise. The student is at B1-B2 level.`;

  const result = await callAI({
    provider,
    systemPrompt,
    userMessage,
    temperature: 0.5,
    maxTokens: 500,
    responseFormat: 'text',
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ explanation: result.content });
}
