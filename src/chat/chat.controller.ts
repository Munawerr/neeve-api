import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller(['chat', 'api/chat'])
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async getChatResponse(
    @Body('query') query?: string,
    @Body('messages') messages?: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<{ response: string; provider: 'gemini' | 'openai' }> {
    const sanitizedMessages = messages?.filter(
      (message): message is { role: 'user' | 'assistant'; content: string } =>
        message.role === 'user' || message.role === 'assistant',
    );

    return this.chatService.getResponse({ query, messages: sanitizedMessages });
  }

  @Post('query')
  async getResponse(@Body('query') query: string): Promise<string> {
    const result = await this.chatService.getResponse({ query });
    return result.response;
  }
}
