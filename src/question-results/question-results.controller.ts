import {
  Controller,
  Get,
  // Post,
  // Body,
  Param,
  // Put,
  // Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  // ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestionResultsService } from './question-results.service';
// import { CreateQuestionResultDto } from './dto/create-question-result.dto';
// import { UpdateQuestionResultDto } from './dto/update-question-result.dto';

@ApiTags('question-results')
@Controller('question-results')
export class QuestionResultsController {
  constructor(
    private readonly questionResultsService: QuestionResultsService,
  ) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Create a new question result' })
  // @ApiBody({ type: CreateQuestionResultDto })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Question result created successfully',
  // })
  // async create(@Body() createQuestionResultDto: CreateQuestionResultDto) {
  //   const questionResult = await this.questionResultsService.create(
  //     createQuestionResultDto,
  //   );
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'Question result created successfully',
  //     data: questionResult,
  //   };
  // }

  // @Get()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Get all question results' })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Question results retrieved successfully',
  // })
  // async findAll() {
  //   const questionResults = await this.questionResultsService.findAll();
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'Question results retrieved successfully',
  //     data: questionResults,
  //   };
  // }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a question result by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question result retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Question result not found',
  })
  async findOne(@Param('id') id: string) {
    const questionResult = await this.questionResultsService.findOne(id);
    if (!questionResult) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Question result not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Question result retrieved successfully',
      data: questionResult,
    };
  }

  // @Put(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Update a question result' })
  // @ApiParam({ name: 'id', required: true })
  // @ApiBody({ type: UpdateQuestionResultDto })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Question result updated successfully',
  // })
  // async update(
  //   @Param('id') id: string,
  //   @Body() updateQuestionResultDto: UpdateQuestionResultDto,
  // ) {
  //   const updatedQuestionResult = await this.questionResultsService.update(
  //     id,
  //     updateQuestionResultDto,
  //   );
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'Question result updated successfully',
  //     data: updatedQuestionResult,
  //   };
  // }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Delete a question result' })
  // @ApiParam({ name: 'id', required: true })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'Question result deleted successfully',
  // })
  // async remove(@Param('id') id: string) {
  //   await this.questionResultsService.remove(id);
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'Question result deleted successfully',
  //   };
  // }
}
