import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    let models: { id: string; name: string }[] = [];

    if (provider === 'openai') {
      const openai = createOpenAI({ apiKey });
      // The AI SDK doesn't directly expose a "list models" function that returns the raw list easily 
      // without using the raw SDK or fetch. Let's use fetch for the raw list to be safe and lightweight.
      
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch OpenAI models');
      }

      const data = await response.json();
      // Filter for chat models usually
      models = data.data
        .filter((m: any) => m.id.includes('gpt')) // Basic filter, user can add custom later
        .map((m: any) => ({ id: m.id, name: m.id }))
        .sort((a: any, b: any) => b.id.localeCompare(a.id));

    } else if (provider === 'google') {
        // Google's list models endpoint
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch Google models');
        }

        const data = await response.json();
        if (data.models) {
            models = data.models
                .filter((m: any) => m.name.includes('gemini'))
                .map((m: any) => {
                    const id = m.name.replace('models/', '');
                    return { id: id, name: m.displayName || id };
                })
                .sort((a: any, b: any) => b.id.localeCompare(a.id));
        }
    } else {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch models' },
      { status: 500 }
    );
  }
}
