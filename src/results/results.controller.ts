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
  UseInterceptors,
  UploadedFile,
  ForbiddenException,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
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
import { SubjectsService } from '../subjects/subjects.service';
import { Subject } from '../subjects/schemas/subject.schema';
import { BulkUploadSubmitDto } from './dto/bulk-upload.dto';

// ---------------------------------------------------------------------------
// URL validation helper
// ---------------------------------------------------------------------------
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Bulk-upload CSV helper functions
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(fileContent: string): string[][] {
  const lines = fileContent
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map(parseCSVLine);
}

function detectColumns(headers: string[]): {
  nameIdx: number;
  emailIdx: number;
  phoneIdx: number;
  subjectHeaders: Array<{ name: string; colIndex: number }>;
  marksIdx: number;
  timeIdx: number;
  rankIdx: number;
  linkIdx: number;
} {
  const normalized = headers.map((h) => h.trim());
  const len = normalized.length;
  return {
    nameIdx: 0,
    emailIdx: 1,
    phoneIdx: 2,
    subjectHeaders: normalized.slice(3, len - 4).map((name, i) => ({
      name,
      colIndex: i + 3,
    })),
    marksIdx: len - 4,
    timeIdx: len - 3,
    rankIdx: len - 2,
    linkIdx: len - 1,
  };
}

function parseSubjectMark(
  raw: string,
): { obtained: number; total: number } | null {
  const cleaned = raw.replace(/\s/g, '');
  const match = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const obtained = parseFloat(match[1]);
  const total = parseFloat(match[2]);
  if (isNaN(obtained) || isNaN(total) || total <= 0) return null;
  return { obtained: Math.max(0, obtained), total };
}

function extractUrl(raw: string): string {
  const hyperlinkMatch = raw.match(/=HYPERLINK\("([^"]+)"/i);
  if (hyperlinkMatch) return hyperlinkMatch[1];
  const urlMatch = raw.match(/https?:\/\/[^\s"]+/);
  if (urlMatch) return urlMatch[0];
  return raw;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter((w) => w.length > 0));
  const setB = new Set(b.split(' ').filter((w) => w.length > 0));
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function hasCommonWord(a: string, b: string): boolean {
  const wordsA = a.split(/\s+/).filter((w) => w.length > 1);
  const wordsB = b.split(/\s+/).filter((w) => w.length > 1);
  return wordsA.some((w) => wordsB.includes(w));
}

function matchSubject(csvHeader: string, subjects: Subject[]): Subject | null {
  const normHeader = normalizeForMatch(csvHeader);

  // Step 1: Exact match after normalization
  const exactMatch = subjects.find(
    (s) => normalizeForMatch(s.title) === normHeader,
  );
  if (exactMatch) return exactMatch;

  // Step 2: One contains the other
  const containsMatch = subjects.find((s) => {
    const normTitle = normalizeForMatch(s.title);
    return normTitle.includes(normHeader) || normHeader.includes(normTitle);
  });
  if (containsMatch) return containsMatch;

  // Step 3: Abbreviation match — csv header is an abbreviation of the subject title
  // e.g. "PHY" → "Physics", "MTH" → "Mathematics"
  const abbreviationMatch = subjects.find((s) => {
    const titleParts = normalizeForMatch(s.title).split(/\s+/);
    const titleAcronym = titleParts.map((p) => p[0]).join('');
    return titleAcronym === normHeader || titleAcronym.includes(normHeader);
  });
  if (abbreviationMatch) return abbreviationMatch;

  // Step 4: Common word match (at least one significant word overlaps)
  const commonWordMatch = subjects.find((s) =>
    hasCommonWord(normalizeForMatch(s.title), normHeader),
  );
  if (commonWordMatch) return commonWordMatch;

  // Step 5: Jaccard word-overlap score >= 0.4
  let bestScore = 0;
  let bestSubject: Subject | null = null;
  for (const subject of subjects) {
    const score = jaccardSimilarity(normalizeForMatch(subject.title), normHeader);
    if (score > bestScore) {
      bestScore = score;
      bestSubject = subject;
    }
  }
  if (bestScore >= 0.4) return bestSubject;

  // Step 6: Levenshtein distance (for typos / small differences)
  let bestLevScore = Infinity;
  let bestLevSubject: Subject | null = null;
  for (const subject of subjects) {
    const dist = levenshteinDistance(normHeader, normalizeForMatch(subject.title));
    const maxLen = Math.max(normHeader.length, normalizeForMatch(subject.title).length);
    const normalizedDist = maxLen > 0 ? dist / maxLen : 1;
    if (normalizedDist < bestLevScore) {
      bestLevScore = normalizedDist;
      bestLevSubject = subject;
    }
  }
  if (bestLevScore <= 0.3) return bestLevSubject;

  return null;
}

@ApiTags('results')
@Controller('results')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly questionResultsService: QuestionResultsService,
    private readonly usersService: UsersService,
    private readonly testsService: TestsService,
    private readonly subjectsService: SubjectsService,
  ) {}

  private getNormalizedMarksPerQuestion(value: number | string | undefined): number {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return 0;
    }

    return Math.abs(numericValue);
  }

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
      marksPerQuestion: this.getNormalizedMarksPerQuestion(
        createResultDto.marksPerQuestion,
      ),
      startedAt: new Date(),
    };
    const result = await this.resultsService.create(_result);
    return {
      status: HttpStatus.OK,
      message: 'Result created successfully',
      data: result,
    };
  }

  // ---------------------------------------------------------------------------
  // Bulk Upload — Parse CSV
  // ---------------------------------------------------------------------------
  @Post('bulk-upload/parse')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (
          file.mimetype !== 'text/csv' &&
          !file.originalname.toLowerCase().endsWith('.csv')
        ) {
          return cb(new Error('Only CSV files are allowed'), false);
        }
        cb(null, true);
      },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Parse a CSV file for bulk report card upload (admin only)' })
  async parseBulkUploadCSV(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {

    if (!file) {
      return { status: HttpStatus.BAD_REQUEST, message: 'No file uploaded' };
    }

    const fileContent = file.buffer.toString('utf-8');
    const rows = parseCSV(fileContent);

    if (rows.length < 2) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'CSV file is empty or has no data rows',
      };
    }

    const headers = rows[0];
    const cols = detectColumns(headers);

    // Pre-fetch all subjects and all students once
    const { subjects: allSubjects } = await this.subjectsService.findAll(1, 10000);

    const preview = await Promise.all(
      rows.slice(1).map(async (row, rowIndex) => {
        const csvName = row[cols.nameIdx] || '';
        const csvEmail = row[cols.emailIdx] || '';
        const csvPhone = row[cols.phoneIdx] || '';
        const csvTime = parseInt(row[cols.timeIdx] || '0', 10) || 0;
        const csvRank = parseInt(row[cols.rankIdx] || '1', 10) || 1;
        const csvLink = extractUrl(row[cols.linkIdx] || '');
        const csvTotalParsed = parseSubjectMark(row[cols.marksIdx] || '');

        const subjectData = cols.subjectHeaders.map(({ name, colIndex }) => {
          const raw = row[colIndex] || '';
          const parsed = parseSubjectMark(raw);
          return {
            csvHeader: name,
            rawValue: raw,
            obtained: parsed?.obtained ?? null,
            total: parsed?.total ?? null,
          };
        });

        // Lookup student: email → phone → phone suffix → name
        let matchedStudent: any = null;
        const trimmedEmail = csvEmail.trim().toLowerCase();
        if (trimmedEmail) {
          matchedStudent = await this.usersService.findByEmailCaseInsensitive(trimmedEmail);
        }
        if (!matchedStudent) {
          const trimmedPhone = csvPhone.trim();
          if (trimmedPhone) {
            matchedStudent = await this.usersService.findByPhone(trimmedPhone);
          }
        }
        if (!matchedStudent) {
          const rawDigits = csvPhone.trim().replace(/\D/g, '');
          if (rawDigits.length >= 7) {
            const last10 = rawDigits.slice(-10);
            matchedStudent =
              await this.usersService.findStudentByPhoneSuffix(last10);
          }
        }
        if (!matchedStudent) {
          const trimmedName = csvName.trim();
          if (trimmedName) {
            matchedStudent =
              await this.usersService.findStudentByName(trimmedName);
          }
        }

        // Match subject headers against all subjects
        const subjectMatches = subjectData.map((sd) => ({
          csvHeader: sd.csvHeader,
          rawValue: sd.rawValue,
          obtained: sd.obtained,
          total: sd.total,
          matchedSubject: matchSubject(sd.csvHeader, allSubjects),
        }));

        return {
          rowIndex,
          csvRow: {
            name: csvName,
            email: csvEmail,
            phone: csvPhone,
            timeTaken: csvTime,
            rank: csvRank,
            totalStudents: null,
            reportCardLink: csvLink,
            totalObtained: csvTotalParsed?.obtained ?? null,
            totalMarks: csvTotalParsed?.total ?? null,
          },
          matchedStudent: matchedStudent
            ? {
                _id: matchedStudent._id,
                full_name: matchedStudent.full_name,
                email: matchedStudent.email,
                phone: matchedStudent.phone,
                regNo: matchedStudent.regNo,
              }
            : null,
          subjectMatches,
          status: matchedStudent ? 'matched' : 'unmatched',
        };
      }),
    );

    return {
      status: HttpStatus.OK,
      message: 'CSV parsed successfully',
      data: {
        totalRows: preview.length,
        matchedCount: preview.filter((r) => r.status === 'matched').length,
        unmatchedCount: preview.filter((r) => r.status === 'unmatched').length,
        rows: preview,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Bulk Upload — Submit Confirmed Rows
  // ---------------------------------------------------------------------------
  @Post('bulk-upload/submit')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit confirmed bulk upload rows to save to DB (admin only)' })
  @ApiBody({ type: BulkUploadSubmitDto })
  async submitBulkUpload(
    @Body() submitDto: BulkUploadSubmitDto,
    @Request() req: any,
  ) {

    // Validate input structure
    if (!submitDto || !Array.isArray(submitDto.rows) || submitDto.rows.length === 0) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'No rows provided in the request body',
        data: { success: 0, failed: [] },
      };
    }

    const results = {
      success: 0,
      failed: [] as Array<{ studentId: string; subjectId: string; error: string }>,
      warnings: [] as Array<{ studentId: string; message: string }>,
    };

    for (const row of submitDto.rows) {
      // Validate each row has required fields
      if (!row.studentId) {
        results.failed.push({
          studentId: row.studentId || 'unknown',
          subjectId: '',
          error: 'Missing studentId',
        });
        continue;
      }

      if (!Array.isArray(row.subjectResults) || row.subjectResults.length === 0) {
        results.failed.push({
          studentId: row.studentId,
          subjectId: '',
          error: 'No subject results found for this student. Ensure subjects in the CSV match subjects in the database.',
        });
        continue;
      }

      // Validate each subject result has required fields
      let hasInvalidSubjectResult = false;
      for (const sr of row.subjectResults) {
        if (!sr.subjectId || typeof sr.obtained !== 'number' || typeof sr.total !== 'number') {
          hasInvalidSubjectResult = true;
          break;
        }
      }
      if (hasInvalidSubjectResult) {
        results.failed.push({
          studentId: row.studentId,
          subjectId: '',
          error: 'One or more subject results have missing or invalid fields (subjectId, obtained, total)',
        });
        continue;
      }

      const student = await this.usersService.getStudentUser(row.studentId);
      if (!student) {
        results.failed.push({
          studentId: row.studentId,
          subjectId: '',
          error: 'Student not found',
        });
        continue;
      }

      const instituteId =
        (student as any).institute?.toString() || (student as any)._id?.toString();

      for (const sr of row.subjectResults) {
        try {
          await this.resultsService.createBulkUploadedResult({
            studentId: row.studentId,
            subjectId: sr.subjectId,
            instituteId,
            obtained: sr.obtained,
            total: sr.total,
            rank: row.rank,
            totalStudents: row.totalStudents,
            timeTaken: row.timeTaken,
            reportCardLink:
              row.reportCardLink && isValidUrl(row.reportCardLink)
                ? row.reportCardLink
                : undefined,
            testType: row.testType || 'mock',
          });

          results.success++;
        } catch (error: any) {
          results.failed.push({
            studentId: row.studentId,
            subjectId: sr.subjectId,
            error: error.message || 'Unknown error',
          });
        }
      }
    }

    return {
      status: HttpStatus.OK,
      message: `Bulk upload complete: ${results.success} records saved, ${results.failed.length} failed`,
      data: results,
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
    const attemptedTests: any = {};

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
      const requiredAnsweredQuestions = Math.max(
        0,
        updatedResult1.numOfQuestions - skipableQuestionsCount,
      );

      // Check if the test should be completed based on answered questions
      const shouldCompleteTest = answeredQuestions >= requiredAnsweredQuestions;

      if (shouldCompleteTest) {
        // Calculate the effective total marks based on required questions, not total questions
        const effectiveTotalQuestions = Math.max(
          0,
          updatedResult1.numOfQuestions - skipableQuestionsCount,
        );
        const marksPerQuestion = this.getNormalizedMarksPerQuestion(
          updatedResult1.marksPerQuestion,
        );
        const totalMarks = effectiveTotalQuestions * marksPerQuestion;

        // Calculate obtained marks with negative marking
        let obtainedMarks = updatedResult1.questionResults.reduce(
          (sum, questionResult: any) => {
            const correctOptions = questionResult.options.filter(
              (option: any) => option.isCorrect,
            );
            const checkedOptions = questionResult.options.filter(
              (option: any) => option.isChecked,
            );

            // If skipped, no marks added or deducted
            if (questionResult.skipped) {
              return sum;
            }

            // If the answer is correct (all correct options selected and only correct options selected)
            if (
              correctOptions.length === checkedOptions.length &&
              correctOptions.every((option: any) => option.isChecked) &&
              checkedOptions.every((option: any) => option.isCorrect)
            ) {
              return sum + marksPerQuestion;
            }

            // If the answer is incorrect, deduct 1 mark
            return sum - 1;
          },
          0,
        );

        // Ensure obtained marks is never negative
        obtainedMarks = Math.max(0, obtainedMarks);

        // Calculate average marks based on effective total marks
        const averageMarks =
          totalMarks > 0 ? Math.max(0, (obtainedMarks / totalMarks) * 100) : 0;

        // Count correct answers
        const correctAnswers = updatedResult1.questionResults.filter(
          (questionResult: any) => {
            // Skipped questions aren't counted as correct
            if (questionResult.skipped) {
              return false;
            }

            const correctOptions = questionResult.options.filter(
              (option: any) => option.isCorrect,
            );
            const checkedOptions = questionResult.options.filter(
              (option: any) => option.isChecked,
            );

            return (
              correctOptions.length === checkedOptions.length &&
              correctOptions.every((option: any) => option.isChecked) &&
              checkedOptions.every((option: any) => option.isCorrect)
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
        const effectiveQuestionCount = Math.max(
          0,
          result.numOfQuestions - skipableQuestionsCount,
        );
        const totalMarks =
          effectiveQuestionCount *
          this.getNormalizedMarksPerQuestion(result.marksPerQuestion);

        const obtainedMarks = result.marksSummary.obtainedMarks;
        const averageMarks = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
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

        const _reportCard: any = {
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

    const uniqueResults = results.reduce<Record<string, Result>>(
      (acc, result) => {
        const testId = result.toObject().test._id;
        if (
          !acc[testId] ||
          acc[testId].marksSummary.obtainedMarks <
            result.marksSummary.obtainedMarks
        ) {
          acc[testId] = result;
        }
        return acc;
      },
      {},
    );

    const uniqueResultsArray = Object.values(uniqueResults);

    // Recalculate total marks accounting for skippable questions
    const totalMarks = await uniqueResultsArray.reduce(
      async (sumPromise: Promise<number>, result) => {
        const sum = await sumPromise;
        const test = await this.testsService.findOne(result.test.toString());
        const skipableQuestionsCount = test?.skipableQuestionsCount || 0;
        const effectiveQuestionCount = Math.max(
          0,
          result.numOfQuestions - skipableQuestionsCount,
        );
        return (
          sum +
          effectiveQuestionCount *
            this.getNormalizedMarksPerQuestion(result.marksPerQuestion)
        );
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
    const averageMarks =
      totalMarks > 0 ? Math.max(0, (obtainedMarks / totalMarks) * 100) : 0;

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
        const effectiveQuestionCount = Math.max(
          0,
          result.numOfQuestions - skipableQuestionsCount,
        );
        const totalMarks =
          effectiveQuestionCount *
          this.getNormalizedMarksPerQuestion(result.marksPerQuestion);

        const obtainedMarks = result.marksSummary.obtainedMarks;
        const averageMarks = totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0;
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

        const _reportCard: any = {
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

    const uniqueResults = results.reduce((acc: any, result) => {
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
    const testSkipableCountMap: any = tests.reduce((map: any, test) => {
      if (test) {
        map[test._id as string] = test.skipableQuestionsCount || 0;
      }
      return map;
    }, {});

    // Calculate total marks considering skippable questions for each test
    const totalMarks = uniqueResultsArray.reduce((sum, result) => {
      const testId = result.test.toString();
      const skipableQuestionsCount = testSkipableCountMap[testId] || 0;
      const effectiveQuestionCount = Math.max(
        0,
        result.numOfQuestions - skipableQuestionsCount,
      );
      return (
        sum +
        effectiveQuestionCount *
          this.getNormalizedMarksPerQuestion(result.marksPerQuestion)
      );
    }, 0);

    const obtainedMarks = Math.max(
      0,
      uniqueResultsArray.reduce(
        (sum, result) => sum + result.marksSummary.obtainedMarks,
        0,
      ),
    );
    const averageMarks =
      totalMarks > 0 ? Math.max(0, (obtainedMarks / totalMarks) * 100) : 0;

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
      return sum + questionTimes.reduce((acc: any, time: any) => acc + time, 0);
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
    const testsTakenByStudent = uniqueResultsArray.length;
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

    // === BULK UPLOAD CHECK ===
    const bulkResults =
      await this.resultsService.findBulkUploadedResultsByStudent(studentId);

    let bulkUploadPayload: any = { hasBulkUploadedData: false };

    if (bulkResults && bulkResults.length > 0) {
      const firstBulk = bulkResults[0];
      const bulkRank = firstBulk.marksSummary?.rank ?? null;
      const bulkTotalStudents = firstBulk.marksSummary?.totalStudents ?? null;

      // Deduplicate: keep only the LATEST result per subject (results are sorted newest-first)
      const subjectMap = new Map<string, any>();
      for (const result of bulkResults) {
        const subject: any = result.subject;
        const subjectId = subject?._id?.toString();
        if (subjectId && !subjectMap.has(subjectId)) {
          subjectMap.set(subjectId, {
            subjectId,
            subjectTitle: subject?.title || 'Unknown Subject',
            obtained: result.marksSummary?.obtainedMarks ?? 0,
            total: result.marksSummary?.totalMarks ?? 0,
            averageMarks: result.marksSummary?.averageMarks ?? 0,
            timeTaken: (result as any).timeTaken ?? 0,
            reportCardLink: (result as any).reportCardLink ?? null,
            testType: result.testType || 'mock',
          });
        }
      }
      const bulkUploadedSubjectResults = Array.from(subjectMap.values());

      const reportCardLink =
        bulkResults.find((r) => (r as any).reportCardLink)
          ? (bulkResults.find((r) => (r as any).reportCardLink) as any)
              .reportCardLink
          : null;

      bulkUploadPayload = {
        hasBulkUploadedData: true,
        bulkRank,
        bulkTotalStudents,
        reportCardLink,
        bulkUploadedSubjectResults,
      };
    }
    // === END BULK UPLOAD CHECK ===

    return {
      status: HttpStatus.OK,
      message: 'Combined report card retrieved successfully',
      data: {
        ...combinedReportCard,
        rank: bulkUploadPayload.hasBulkUploadedData
          ? bulkUploadPayload.bulkRank
          : undefined,
        totalStudents: bulkUploadPayload.hasBulkUploadedData
          ? bulkUploadPayload.bulkTotalStudents
          : undefined,
        hasBulkUploadedData: bulkUploadPayload.hasBulkUploadedData,
        reportCardLink: bulkUploadPayload.reportCardLink ?? null,
        bulkUploadedSubjectResults:
          bulkUploadPayload.bulkUploadedSubjectResults ?? [],
      },
    };
  }

  // Get subject result history for a student
  @Get('history/:studentId/:subjectId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get historical results for a student+subject' })
  async getSubjectHistory(
    @Param('studentId') studentId: string,
    @Param('subjectId') subjectId: string,
  ) {
    const results =
      await this.resultsService.findSubjectHistory(studentId, subjectId);

    const student = await this.usersService.getStudentUser(studentId);
    const subject = await this.subjectsService.findOne(subjectId);

    const history = results.map((r) => ({
      resultId: r._id,
      obtained: r.marksSummary?.obtainedMarks ?? 0,
      total: r.marksSummary?.totalMarks ?? 0,
      averageMarks: r.marksSummary?.averageMarks ?? 0,
      rank: r.marksSummary?.rank ?? null,
      totalStudents: r.marksSummary?.totalStudents ?? null,
      timeTaken: (r as any).timeTaken ?? 0,
      reportCardLink: (r as any).reportCardLink ?? null,
      testType: r.testType || 'mock',
      createdAt: (r._id as any).getTimestamp(),
    }));

    return {
      status: HttpStatus.OK,
      data: {
        student: student
          ? {
              _id: student._id,
              full_name: student.full_name,
              email: student.email,
              phone: student.phone,
              regNo: student.regNo,
            }
          : null,
        subject: subject
          ? { _id: subject._id, title: subject.title }
          : null,
        history,
      },
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
