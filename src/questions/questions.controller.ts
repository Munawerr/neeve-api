import {
  Controller,
  Body,
  Param,
  Put,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionsService } from './questions.service';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a question' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateQuestionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    const updatedQuestion = await this.questionsService.update(
      id,
      updateQuestionDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Question updated successfully',
      data: updatedQuestion,
    };
  }
}
