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
import { MarksSummaryDto, UpdateResultDto } from './dto/update-result.dto';
import { Result, ResultStatus } from './schemas/result.schema';
import { QuestionResultsService } from '../question-results/question-results.service';
import { CreateQuestionResultDto } from '../question-results/dto/create-question-result.dto';
import { Schema as MongooseSchema } from 'mongoose';
import {
  findAllByStudentIdExample,
  findOneExample,
  reportCardExample,
  subjectReportCardExample,
  combinedReportCardExample,
} from './examples/results';
import { ReportCardDto } from './dto/report-card.dto';
import { QuestionResult } from 'src/question-results/schemas/question-result.schema';
import { UsersService } from '../users/users.service';
import { TestsService } from 'src/tests/tests.service';

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly questionResultsService: QuestionResultsService,
    private readonly usersService: UsersService,
    private readonly testsService: TestsService,
  ) {}

  // Create a new result
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
    // Check if the student already has a result for the particular test
    const existingResult = await this.resultsService.findOneByStudentAndTest(
      createResultDto.student,
      createResultDto.test,
    );

    if (existingResult) {
      // Delete the previous result
      await this.resultsService.remove(existingResult.toObject()._id);
    }

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

  // Create a new question result
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

  // Get all results
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

  // Get all results for a student
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

  // Get a result by ID
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

  // Finish a test
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Finish a Test' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: CreateQuestionResultDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test Finished successfully',
    schema: {
      example: { ...findOneExample, message: 'Result updated successfully' },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() createQuestionResultDto: CreateQuestionResultDto,
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

    const questionResult = await this.questionResultsService.create(
      createQuestionResultDto,
    );

    result.questionResults.push(
      questionResult._id as MongooseSchema.Types.ObjectId,
    );
    await this.resultsService.update(id, result);

    const updatedResult1 = await this.resultsService.findOne(id);

    if (updatedResult1) {
      const totalMarks =
        updatedResult1.numOfQuestions * updatedResult1.marksPerQuestion;
      const obtainedMarks = updatedResult1.questionResults.reduce(
        (sum, questionResult) => {
          const correctOptions = questionResult.options.filter(
            (option) => option.isCorrect,
          );
          const checkedOptions = questionResult.options.filter(
            (option) => option.isChecked,
          );

          if (
            correctOptions.length === checkedOptions.length &&
            correctOptions.every((option) => option.isChecked) &&
            checkedOptions.every((option) => option.isCorrect)
          ) {
            return sum + updatedResult1.marksPerQuestion;
          }
          return sum;
        },
        0,
      );
      const averageMarks = (obtainedMarks / totalMarks) * 100;

      const correctAnswers = updatedResult1.questionResults.filter(
        (questionResult) => {
          const correctOptions = questionResult.options.filter(
            (option) => option.isCorrect,
          );
          const checkedOptions = questionResult.options.filter(
            (option) => option.isChecked,
          );
          return (
            correctOptions.length === checkedOptions.length &&
            correctOptions.every((option) => option.isChecked) &&
            checkedOptions.every((option) => option.isCorrect)
          );
        },
      ).length;

      const incorrectAnswers = updatedResult1.numOfQuestions - correctAnswers;

      const totalTimeInMinutes = updatedResult1
        .toObject()
        .questionResults.reduce(
          (
            sum: number,
            questionResult: QuestionResult,
            index: number,
            array: QuestionResult[],
          ) => {
            if (index === 0) return sum;
            const previousQuestion = array[index - 1];
            return (
              sum +
              (new Date(questionResult.createdAt).getTime() -
                new Date(previousQuestion.createdAt).getTime()) /
                60000
            );
          },
          0,
        );

      const averageTimePerQuestion =
        totalTimeInMinutes / updatedResult1.numOfQuestions;

      const marksSummary: MarksSummaryDto = {
        totalMarks,
        obtainedMarks,
        averageMarks,
        correctAnswers,
        incorrectAnswers,
        averageTimePerQuestion,
      };

      const updateResultDto: UpdateResultDto = {};
      updateResultDto.finishedAt = new Date();
      updateResultDto.status = ResultStatus.FINISHED;
      updateResultDto.marksSummary = marksSummary;

      await this.resultsService.update(id, updateResultDto);

      const updatedResult2 = await this.resultsService.findOne(id);

      return {
        status: HttpStatus.OK,
        message: 'Result updated successfully',
        data: updatedResult2,
      };
    }
  }

  // Get report card for a student
  @Post('report-card/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report card for a student' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiBody({ type: ReportCardDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Report card retrieved successfully',
    schema: {
      example: reportCardExample,
    },
  })
  async getReportCard(
    @Param('studentId') studentId: string,
    @Body() reportCardDto: ReportCardDto,
  ) {
    const { testType, subject } = reportCardDto;
    const results = await this.resultsService.findFinishedResults(
      studentId,
      subject,
      testType,
    );

    const reportCard = await Promise.all(
      results.map(async (result) => {
        const test = result.toObject().test;
        const title = test.title;
        const totalMarks = result.marksSummary.totalMarks;
        const obtainedMarks = result.marksSummary.obtainedMarks;
        const averageMarks = (obtainedMarks / totalMarks) * 100;
        const correctAnswers = result.marksSummary.correctAnswers;
        const incorrectAnswers = result.marksSummary.incorrectAnswers;
        const averageTimePerQuestion =
          result.marksSummary.averageTimePerQuestion;
        const mostRecentFinishedAt = result.finishedAt;

        // Calculate percentile for this test
        const percentile = await this.resultsService.calculatePercentile(
          result.toObject()._id,
          test._id,
          averageMarks,
        );

        let _reportCard = {
          title,
          totalMarks,
          obtainedMarks,
          averageMarks,
          percentile,
          correctAnswers,
          incorrectAnswers,
          averageTimePerQuestion,
          mostRecentFinishedAt,
        };

        if (testType !== 'mock') {
          _reportCard['topic_title'] = test.topic.title;
        }

        return _reportCard;
      }),
    );

    return {
      status: HttpStatus.OK,
      message: 'Report card retrieved successfully',
      data: reportCard,
    };
  }

  // Get subject report card for a student
  @Post('subject-report-card/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subject report card for a student' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiBody({ type: ReportCardDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subject report card retrieved successfully',
    schema: {
      example: subjectReportCardExample,
    },
  })
  async getSubjectReportCard(
    @Param('studentId') studentId: string,
    @Body() reportCardDto: ReportCardDto,
  ) {
    const { testType, subject } = reportCardDto;
    const results = await this.resultsService.findFinishedResults(
      studentId,
      subject,
      testType,
    );

    const uniqueResults = results.reduce((acc, result) => {
      const testId = result.toObject().test._id;
      if (
        !acc[testId] ||
        acc[testId].marksSummary.obtainedMarks <
          result.marksSummary.obtainedMarks
      ) {
        acc[testId] = result;
      }
      return acc;
    }, {});

    const uniqueResultsArray = Object.values(uniqueResults) as Result[];

    const totalMarks = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.totalMarks,
      0,
    );
    const obtainedMarks = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.obtainedMarks,
      0,
    );
    const averageMarks = (obtainedMarks / totalMarks) * 100;

    const correctAnswers = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.correctAnswers,
      0,
    );
    const incorrectAnswers = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.incorrectAnswers,
      0,
    );
    const averageTimePerQuestion =
      uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.averageTimePerQuestion,
        0,
      ) / uniqueResultsArray.length;

    // Calculate percentile for this subject
    const percentile = await this.resultsService.calculateSubjectPercentile(
      studentId,
      subject,
      testType,
      averageMarks,
    );

    const subjectReportCard = {
      subjectId: subject,
      totalMarks,
      obtainedMarks,
      averageMarks,
      percentile,
      correctAnswers,
      incorrectAnswers,
      averageTimePerQuestion,
    };

    return {
      status: HttpStatus.OK,
      message: 'Subject report card retrieved successfully',
      data: subjectReportCard,
    };
  }

  // Get combined report card for a student
  @Get('combined-report-card/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get combined report card for a student' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Combined report card retrieved successfully',
    schema: {
      example: combinedReportCardExample,
    },
  })
  async getCombinedReportCard(@Param('studentId') studentId: string) {
    const results =
      await this.resultsService.findFinishedResultsByStudent(studentId);

    const uniqueResults = results.reduce((acc, result) => {
      const testId = result.toObject().test._id;
      if (
        !acc[testId] ||
        acc[testId].marksSummary.obtainedMarks <
          result.marksSummary.obtainedMarks
      ) {
        acc[testId] = result;
      }
      return acc;
    }, {});

    const uniqueResultsArray: Result[] = Object.values(uniqueResults);

    const totalMarks = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.totalMarks,
      0,
    );
    const obtainedMarks = uniqueResultsArray.reduce(
      (sum, result) => sum + result.marksSummary.obtainedMarks,
      0,
    );
    const averageMarks = (obtainedMarks / totalMarks) * 100;

    const totalQuestions = uniqueResultsArray.reduce(
      (sum, result) => sum + result.numOfQuestions,
      0,
    );

    const totalTimeInMinutes = uniqueResultsArray.reduce((sum, result) => {
      const questionTimes = result
        .toObject()
        .questionResults.map(
          (
            questionResult: QuestionResult,
            index: number,
            array: QuestionResult[],
          ) => {
            if (index === 0) return 0;
            const previousQuestion = array[index - 1];
            return (
              (new Date(questionResult.createdAt).getTime() -
                new Date(previousQuestion.createdAt).getTime()) /
              60000
            );
          },
        );
      return sum + questionTimes.reduce((acc, time) => acc + time, 0);
    }, 0);

    const averageTimePerQuestion = totalTimeInMinutes / totalQuestions;

    // Get student object
    const student = await this.usersService.getStudentUser(studentId);
    if (!student) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Student not found',
      };
    }

    // Calculate test summary
    const packages = student.packages;
    let totalTestsInCourse = 0;
    let testsTakenByStudent = uniqueResultsArray.length;
    let remainingTests = 0;

    for (const pkg of packages) {
      for (const subjectId of pkg.subjects) {
        const tests = await this.testsService.findTestsBySubject(
          subjectId.toString(),
        );
        totalTestsInCourse += tests.length;
      }
    }

    remainingTests = totalTestsInCourse - testsTakenByStudent;

    // Calculate overall percentile
    const percentile = await this.resultsService.calculateOverallPercentile(
      studentId,
      averageMarks,
    );

    const testSummary = {
      totalTestsInCourse,
      testsTakenByStudent,
      remainingTests,
    };

    const combinedReportCard = {
      totalMarks,
      obtainedMarks,
      averageMarks,
      percentile,
      correctAnswers: uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.correctAnswers,
        0,
      ),
      incorrectAnswers: uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.incorrectAnswers,
        0,
      ),
      averageTimePerQuestion,
      testSummary,
    };

    return {
      status: HttpStatus.OK,
      message: 'Combined report card retrieved successfully',
      data: combinedReportCard,
    };
  }

  // Delete a result
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
