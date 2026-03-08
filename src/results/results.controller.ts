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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
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
import { TestType } from 'src/tests/schemas/test.schema';

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

    // Only delete previous result if it's not a practice test
    if (existingResult && createResultDto.testType !== TestType.PRACTICE) {
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

  // Check if student has attempted tests
  @Get('student/:studentId/attempted')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if student has attempted tests' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiQuery({ name: 'testIds', required: true, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Attempted tests retrieved successfully',
  })
  async checkAttemptedTests(
    @Param('studentId') studentId: string,
    @Query('testIds') testIds: string,
  ) {
    const testIdArray = testIds.split(',');
    const attemptedTests = {};

    // Check each test if the student has attempted it
    for (const testId of testIdArray) {
      const result = await this.resultsService.findOneByStudentAndTest(
        studentId,
        testId,
      );
      attemptedTests[testId] = result ? true : false;
    }

    return {
      status: HttpStatus.OK,
      message: 'Attempted tests retrieved successfully',
      data: attemptedTests,
    };
  }

  // Get all practice test attempts for a specific test by a student
  @Get('student/:studentId/test/:testId/practice-attempts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all practice test attempts for a specific test by a student',
  })
  @ApiParam({ name: 'studentId', required: true })
  @ApiParam({ name: 'testId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Practice test attempts retrieved successfully',
  })
  async getPracticeTestAttempts(
    @Param('studentId') studentId: string,
    @Param('testId') testId: string,
  ) {
    const results = await this.resultsService.findAllAttemptsByStudentAndTest(
      studentId,
      testId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Practice test attempts retrieved successfully',
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

    // Ensure the question field is provided even for skipped questions
    if (!createQuestionResultDto.questionText) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Question ID is required even for skipped questions',
      };
    }

    // Create question result (whether skipped or not)
    const questionResult = await this.questionResultsService.create(
      createQuestionResultDto,
    );

    result.questionResults.push(
      questionResult._id as MongooseSchema.Types.ObjectId,
    );
    await this.resultsService.update(id, result);

    const updatedResult1 = await this.resultsService.findOne(id);

    if (updatedResult1) {
      // Get test details to access skipableQuestionsCount
      const testId = updatedResult1.toObject().test._id
        ? updatedResult1.toObject().test._id
        : updatedResult1.test;
      const test = await this.testsService.findOne(testId);

      if (!test) {
        return {
          status: HttpStatus.EXPECTATION_FAILED,
          message: 'Test not found',
        };
      }

      // Count skipped questions
      const skippedQuestions = updatedResult1.questionResults.filter(
        (questionResult: any) => questionResult.skipped,
      ).length;

      // Count answered questions (non-skipped)
      const answeredQuestions =
        updatedResult1.questionResults.length - skippedQuestions;

      // Get the number of skippable questions from the test
      const skipableQuestionsCount = test.skipableQuestionsCount || 0;

      // Calculate the required number of questions to answer (total - skippable)
      const requiredAnsweredQuestions =
        updatedResult1.numOfQuestions - skipableQuestionsCount;

      // Check if the test should be completed based on answered questions
      const shouldCompleteTest = answeredQuestions >= requiredAnsweredQuestions;

      if (shouldCompleteTest) {
        // Calculate the effective total marks based on required questions, not total questions
        const effectiveTotalQuestions =
          updatedResult1.numOfQuestions - skipableQuestionsCount;
        const totalMarks =
          effectiveTotalQuestions * updatedResult1.marksPerQuestion;

        // Calculate obtained marks with negative marking
        let obtainedMarks = updatedResult1.questionResults.reduce(
          (sum, questionResult: any) => {
            const correctOptions = questionResult.options.filter(
              (option) => option.isCorrect,
            );
            const checkedOptions = questionResult.options.filter(
              (option) => option.isChecked,
            );

            // If skipped, no marks added or deducted
            if (questionResult.skipped) {
              return sum;
            }

            // If the answer is correct (all correct options selected and only correct options selected)
            if (
              correctOptions.length === checkedOptions.length &&
              correctOptions.every((option) => option.isChecked) &&
              checkedOptions.every((option) => option.isCorrect)
            ) {
              return sum + updatedResult1.marksPerQuestion;
            }

            // If the answer is incorrect, deduct 1 mark
            return sum - 1;
          },
          0,
        );

        // Ensure obtained marks is never negative
        obtainedMarks = Math.max(0, obtainedMarks);

        // Calculate average marks based on effective total marks
        const averageMarks = Math.max(0, (obtainedMarks / totalMarks) * 100);

        // Count correct answers
        const correctAnswers = updatedResult1.questionResults.filter(
          (questionResult: any) => {
            // Skipped questions aren't counted as correct
            if (questionResult.skipped) {
              return false;
            }

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

        // Incorrect answers are those that are not correct and not skipped
        const incorrectAnswers =
          updatedResult1.questionResults.length -
          correctAnswers -
          skippedQuestions;

        const totalTimeInSeconds = updatedResult1
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
                  1000 // convert to seconds
              );
            },
            0,
          );

        const averageTimePerQuestion =
          totalTimeInSeconds / updatedResult1.questionResults.length;

        // Calculate test-specific rank and percentile
        const rankingData =
          await this.resultsService.calculateTestSpecificPercentile(
            testId,
            averageMarks,
          );

        const marksSummary: MarksSummaryDto = {
          totalMarks,
          obtainedMarks,
          averageMarks,
          correctAnswers,
          incorrectAnswers,
          averageTimePerQuestion,
          skippedQuestions,
          percentile: rankingData.percentile,
          rank: rankingData.rank,
          totalStudents: rankingData.totalStudents,
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
      } else {
        // If test is not complete yet, just return the updated result
        return {
          status: HttpStatus.OK,
          message: 'Question recorded successfully',
          data: updatedResult1,
        };
      }
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

        // Consider skippable questions in total marks calculation
        const skipableQuestionsCount = test.skipableQuestionsCount || 0;
        const effectiveQuestionCount =
          result.numOfQuestions - skipableQuestionsCount;
        const totalMarks = effectiveQuestionCount * result.marksPerQuestion;

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
          title: test.title,
          totalMarks,
          obtainedMarks,
          averageMarks,
          percentile,
          correctAnswers,
          incorrectAnswers,
          averageTimePerQuestion,
          mostRecentFinishedAt,
        };

        if (testType !== TestType.MOCK && test.topic) {
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

    // Recalculate total marks accounting for skippable questions
    const totalMarks = await uniqueResultsArray.reduce(
      async (sumPromise, result) => {
        const sum = await sumPromise;
        const test = await this.testsService.findOne(result.test.toString());
        const skipableQuestionsCount = test?.skipableQuestionsCount || 0;
        const effectiveQuestionCount =
          result.numOfQuestions - skipableQuestionsCount;
        return sum + effectiveQuestionCount * result.marksPerQuestion;
      },
      Promise.resolve(0),
    );

    const obtainedMarks = Math.max(
      0,
      uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.obtainedMarks,
        0,
      ),
    );
    const averageMarks = Math.max(0, (obtainedMarks / totalMarks) * 100);

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

  // Get report card for all subjects for a student
  @Post('all-subjects-report-card/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get report card for all subjects for a student' })
  @ApiParam({ name: 'studentId', required: true })
  @ApiBody({ type: ReportCardDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All subjects report card retrieved successfully',
  })
  async getAllSubjectsReportCard(
    @Param('studentId') studentId: string,
    @Body() reportCardDto: ReportCardDto,
  ) {
    const { testType } = reportCardDto;
    const results = await this.resultsService.findFinishedResultsAllSubjects(
      studentId,
      testType,
    );

    const reportCard = await Promise.all(
      results.map(async (result) => {
        const test = result.toObject().test;
        const subject = result.toObject().subject;

        // Consider skippable questions in total marks calculation
        const skipableQuestionsCount = test.skipableQuestionsCount || 0;
        const effectiveQuestionCount =
          result.numOfQuestions - skipableQuestionsCount;
        const totalMarks = effectiveQuestionCount * result.marksPerQuestion;

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
          title: test.title,
          subject_title: subject.title,
          totalMarks,
          obtainedMarks,
          averageMarks,
          percentile,
          correctAnswers,
          incorrectAnswers,
          averageTimePerQuestion,
          mostRecentFinishedAt,
        };

        if (testType !== TestType.MOCK && test.topic) {
          _reportCard['topic_title'] = test.topic.title;
        }

        return _reportCard;
      }),
    );

    // Sort by most recent test first
    reportCard.sort(
      (a, b) =>
        new Date(b.mostRecentFinishedAt).getTime() -
        new Date(a.mostRecentFinishedAt).getTime(),
    );

    return {
      status: HttpStatus.OK,
      message: 'All subjects report card retrieved successfully',
      data: reportCard,
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

    // Get all test IDs to fetch their skipableQuestionsCount
    const testIds = uniqueResultsArray.map((result) => result.test.toString());
    const tests = await Promise.all(
      testIds.map((id) => this.testsService.findOne(id)),
    );

    // Create a map of test IDs to their skipableQuestionsCount for quick lookup
    const testSkipableCountMap = tests.reduce((map, test) => {
      if (test) {
        map[test._id as string] = test.skipableQuestionsCount || 0;
      }
      return map;
    }, {});

    // Calculate total marks considering skippable questions for each test
    const totalMarks = uniqueResultsArray.reduce((sum, result) => {
      const testId = result.test.toString();
      const skipableQuestionsCount = testSkipableCountMap[testId] || 0;
      const effectiveQuestionCount =
        result.numOfQuestions - skipableQuestionsCount;
      return sum + effectiveQuestionCount * result.marksPerQuestion;
    }, 0);

    const obtainedMarks = Math.max(
      0,
      uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.obtainedMarks,
        0,
      ),
    );
    const averageMarks = Math.max(0, (obtainedMarks / totalMarks) * 100);

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
