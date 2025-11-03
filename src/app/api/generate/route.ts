import { OpenAIStream, OpenAIStreamPayload } from '@/lib/openai-stream';

export const runtime = 'edge';

export async function POST(req: Request): Promise<Response> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response('Missing OpenAI API key', { status: 500 });
    }

    const { schema, query, chatHistory } = (await req.json()) as {
      schema?: string;
      query?: string;
      chatHistory?: Array<{ role: string; content: string }>;
    };

    if (!query) {
      return new Response('No query in the request', { status: 400 });
    }

    // Build messages array with chat history
    const messages: Array<{ role: string; content: string }> = [
      {
        role: 'system',
        content:
          'You are Postgres & Supabase expert. Translate given natural language query into SQL without changing the case of the entries given. Maintain context from previous conversations. When modifying schema, provide incremental changes, not full regeneration.',
      },
    ];

    // Add chat history if provided
    if (chatHistory && chatHistory.length > 0) {
      // Add previous conversation context (limit to last 5 messages to avoid token limit)
      const recentHistory = chatHistory.slice(-5);
      messages.push(...recentHistory);
    }

    // Add current schema and query
    messages.push({
      role: 'user',
      content: schema
        ? `### Postgres SQL tables, with their properties:\n#${schema}\n### ${query}\n`
        : `### ${query}\n`,
    });

    const payload: OpenAIStreamPayload = {
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 500, // Increased for better responses
      stream: true,
      n: 1,
    };

    const stream = await OpenAIStream(payload);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
