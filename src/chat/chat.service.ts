import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ChatService {
  private readonly apiUrl = 'https://api.openai.com/v1/engines/davinci-codex/completions';
  private readonly apiKey = process.env.OPENAI_API_KEY;

  async getResponse(query: string): Promise<string> {
    const prompt = this.createPrompt(query);
    const response = await axios.post(
      this.apiUrl,
      {
        prompt,
        max_tokens: 150,
        n: 1,
        stop: null,
        temperature: 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );
    return response.data.choices[0].text.trim();
  }

  private createPrompt(query: string): string {
    return `You are an AI assistant specialized in helping students with their studies. Only answer questions related to studies and LMS platform. Here is the query: ${query}`;
  }
}
