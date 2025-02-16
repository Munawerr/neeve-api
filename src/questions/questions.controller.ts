import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
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
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question created successfully',
  })
  async create(@Body() createQuestionDto: CreateQuestionDto) {
    const question = await this.questionsService.create(createQuestionDto);
    return {
      status: HttpStatus.OK,
      message: 'Question created successfully',
      data: question,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a question by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Question not found',
  })
  async findOne(@Param('id') id: string) {
    const question = await this.questionsService.findOne(id);
    if (!question) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Question not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Question retrieved successfully',
      data: question,
    };
  }

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

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.questionsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Question deleted successfully',
    };
  }
}
