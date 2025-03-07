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
import { ResultsService } from './results.service';
import {
  CreateResultDto,
  CreateResultServiceDto,
} from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { ResultStatus } from './schemas/result.schema';
import { QuestionResultsService } from '../question-results/question-results.service';
import { CreateQuestionResultDto } from '../question-results/dto/create-question-result.dto';
import { Schema as MongooseSchema } from 'mongoose';
import { findAllByStudentIdExample, findOneExample } from './examples/results';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly questionResultsService: QuestionResultsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new result' })
  @ApiBody({ type: CreateResultDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Result created successfully',
  })
  async create(@Body() createResultDto: CreateResultDto) {
    const _result: CreateResultServiceDto = {
      ...createResultDto,
      startedAt: new Date(),
    };
    const result = await this.resultsService.create(_result);
    return {
      status: HttpStatus.OK,
      message: 'Result created successfully',
      data: result,
    };
  }

  @Post(':id/question-results')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question result' })
  @ApiBody({ type: CreateQuestionResultDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question result created successfully',
  })
  async createQuestionResult(
    @Param('id') resultId: string,
    @Body() createQuestionResultDto: CreateQuestionResultDto,
  ) {
    const questionResult = await this.questionResultsService.create(
      createQuestionResultDto,
    );

    const result = await this.resultsService.findOne(resultId);
    if (!result) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Result not found',
      };
    }

    result.questionResults.push(
      questionResult._id as MongooseSchema.Types.ObjectId,
    );
    await this.resultsService.update(resultId, result);

    const UpdatedResult = await this.resultsService.findOne(resultId);

    return {
      status: HttpStatus.OK,
      message: 'Question result created successfully',
      data: UpdatedResult,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all results' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Results retrieved successfully',
  })
  async findAll() {
    const results = await this.resultsService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Results retrieved successfully',
      data: results,
    };
  }

  @Get('student/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all results for a student' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Results retrieved successfully',
    schema: {
      example: findAllByStudentIdExample,
    },
  })
  async findAllByStudentId(@Param('studentId') studentId: string) {
    const results = await this.resultsService.findAllByStudentId(studentId);
    return {
      status: HttpStatus.OK,
      message: 'Results retrieved successfully',
      data: results,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a result by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Result retrieved successfully',
    schema: {
      example: findOneExample,
    },
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Result not found',
  })
  async findOne(@Param('id') id: string) {
    const result = await this.resultsService.findOne(id);
    if (!result) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Result not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Result retrieved successfully',
      data: result,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finish a Test' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateResultDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test Finished successfully',
    schema: {
      example: { ...findOneExample, message: 'Result updated successfully' },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateResultDto,
  ) {
    const result = await this.resultsService.findOne(id);
    if (!result) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Result not found',
      };
    }
    if (result.status === ResultStatus.FINISHED) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Test already finished',
      };
    }

    updateResultDto.finishedAt = new Date();
    updateResultDto.status = ResultStatus.FINISHED;

    await this.resultsService.update(id, updateResultDto);

    const updatedResult = await this.resultsService.findOne(id);

    return {
      status: HttpStatus.OK,
      message: 'Result updated successfully',
      data: updatedResult,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a result' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Result deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.resultsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Result deleted successfully',
    };
  }
}
