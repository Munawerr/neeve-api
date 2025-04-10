import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('query')
  async getResponse(@Body('query') query: string): Promise<string> {
    return this.chatService.getResponse(query);
  }
}
