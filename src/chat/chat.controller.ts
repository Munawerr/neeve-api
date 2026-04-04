import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async getChatResponse(
    @Body('query') query?: string,
    @Body('messages') messages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  ): Promise<{ response: string; provider: 'gemini' | 'openai' }> {
    return this.chatService.getResponse({ query, messages });
  }

  @Post('query')
  async getResponse(@Body('query') query: string): Promise<{ response: string; provider: 'gemini' | 'openai' }> {
    return this.chatService.getResponse({ query });
  }
}
