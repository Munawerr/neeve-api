import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { OpenAI } from 'openai';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

@Injectable()
export class ChatService {
  private readonly geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY;
  private readonly geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  private readonly openAiApiKey = process.env.OPENAI_API_KEY;
  private readonly openai: OpenAI | null;
  private readonly systemPrompt =
    'You are an AI instructor specialized in helping students with their studies. Only answer questions related to studies and LMS platform.';

  constructor() {
    this.openai = this.openAiApiKey ? new OpenAI({ apiKey: this.openAiApiKey }) : null;
  }

  async getResponse(input: { query?: string; messages?: ChatMessage[] }): Promise<{ response: string; provider: 'gemini' | 'openai' }> {
    const messages = this.normalizeMessages(input);
    let geminiError: unknown;

    if (this.geminiApiKey) {
      try {
        const response = await this.getGeminiResponse(messages);
        return { response, provider: 'gemini' };
      } catch (error) {
        geminiError = error;
        console.error('Gemini request failed, falling back to OpenAI:', error);
      }
    }

    if (geminiError && !this.openAiApiKey) {
      throw new AggregateError(
        [geminiError],
        'Gemini request failed and OpenAI fallback is not configured',
      );
    }

    try {
      const response = await this.getOpenAiResponse(messages);
      return { response, provider: 'openai' };
    } catch (error) {
      if (geminiError) {
        throw new AggregateError(
          [geminiError, error],
          'Gemini request failed and OpenAI fallback also failed',
        );
      }

      throw error;
    }
  }

  private normalizeMessages(input: { query?: string; messages?: ChatMessage[] }): ChatMessage[] {
    if (Array.isArray(input.messages) && input.messages.length > 0) {
      return input.messages
        .filter((message) =>
          message &&
          typeof message.content === 'string' &&
          ['system', 'user', 'assistant'].includes(message.role),
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));
    }

    const query = (input.query || '').trim();
    return [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: query || 'Help me with my studies.' },
    ];
  }

  private async getGeminiResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const systemMessages = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n');

    const geminiMessages = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.geminiModel}:generateContent`,
      {
        ...(systemMessages ? { systemInstruction: { parts: [{ text: systemMessages }] } } : {}),
        contents: geminiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      },
      {
        params: { key: this.geminiApiKey },
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const parts = response.data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
      ? parts.map((part: { text?: string }) => part?.text || '').join('').trim()
      : '';

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  }

  private async getOpenAiResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI API key is not configured');
    }

    const response = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      temperature: 0.7,
      max_tokens: 500,
    });

    const text = response.choices?.[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('OpenAI returned an empty response');
    }

    return text;
  }
}
