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
  Res,
  SetMetadata,
  Query,
  UploadedFile,
  UseInterceptors,
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
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TopicsService } from 'src/topics/topics.service';
import { QuestionsService } from 'src/questions/questions.service';
import { CreateQuestionDto } from 'src/questions/dto/create-question.dto';
import { Schema as MongooseSchema } from 'mongoose';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import * as htmlToText from 'html-to-text';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('tests')
@Controller('tests')
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly topicsService: TopicsService,
    private readonly questionsService: QuestionsService, // Add QuestionsService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new test' })
  @ApiBody({ type: CreateTestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test created successfully',
  })
  async create(@Body() createTestDto: CreateTestDto) {
    const test = await this.testsService.create(createTestDto);

    if (test.topic) {
      const topic = await this.topicsService.findOne(test.topic.toString());

      topic?.tests.push(test._id as MongooseSchema.Types.ObjectId);
      topic?.save();
    }

    return {
      status: HttpStatus.OK,
      message: 'Test created successfully',
      data: test,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tests' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tests retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to retrieve tests',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const { tests, total } = await this.testsService.findAll(
        page,
        limit,
        search,
      );
      return {
        status: HttpStatus.OK,
        message: 'Tests retrieved successfully',
        data: { items: tests, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve tests',
        error: error.message,
      };
    }
  }

  @Get('subject/:subject/mock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all mock tests' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tests retrieved successfully',
  })
  async findAllMockTests(@Param('subject') subject: string) {
    const tests = await this.testsService.findAllMockTests(subject);
    return {
      status: HttpStatus.OK,
      message: 'Tests retrieved successfully',
      data: tests,
    };
  }

  @Get('subject/:subjectId/mock-tests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all mock tests by subject ID' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Mock tests retrieved successfully',
  })
  async getMockTestsBySubject(@Param('subjectId') subjectId: string) {
    const tests = await this.testsService.findAllMockTests(subjectId);
    return {
      status: HttpStatus.OK,
      message: 'Mock tests retrieved successfully',
      data: tests,
    };
  }

  @Get('topic/:topicId/tests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tests by topic ID' })
  @ApiParam({ name: 'topicId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tests retrieved successfully',
  })
  async getTestsByTopic(@Param('topicId') topicId: string) {
    const tests = await this.testsService.findTestsByTopic(topicId);
    return {
      status: HttpStatus.OK,
      message: 'Tests retrieved successfully',
      data: tests,
    };
  }

  @Get('subject/:subjectId/topic/:topicId/all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tests by subject ID and topic ID' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiParam({ name: 'topicId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tests retrieved successfully',
  })
  async getAllTests(
    @Param('subjectId') subjectId: string,
    @Param('topicId') topicId: string,
  ) {
    const { mockTests, otherTests } = await this.testsService.findAllTests(
      subjectId,
      topicId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Tests retrieved successfully',
      data: { mockTests, otherTests },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a test by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Test not found',
  })
  async findOne(@Param('id') id: string) {
    const test = await this.testsService.findOne(id);
    if (!test) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Test not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Test retrieved successfully',
      data: test,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a test' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateTestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test updated successfully',
  })
  async update(@Param('id') id: string, @Body() updateTestDto: UpdateTestDto) {
    const updatedTest = await this.testsService.update(id, updateTestDto);
    return {
      status: HttpStatus.OK,
      message: 'Test updated successfully',
      data: updatedTest,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a test' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.testsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Test deleted successfully',
    };
  }

  @Post(':testId/questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new question for a test' })
  @ApiBody({ type: CreateQuestionDto })
  @ApiParam({ name: 'testId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question created successfully',
  })
  async createQuestion(
    @Param('testId') testId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    const question = await this.questionsService.create(createQuestionDto);
    const test = await this.testsService.findOne(testId);

    if (test) {
      test.questions.push(question._id as MongooseSchema.Types.ObjectId);
      await test.save();
    }

    return {
      status: HttpStatus.OK,
      message: 'Question created successfully',
      data: question,
    };
  }

  @Delete(':testId/questions/:questionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a question from a test' })
  @ApiParam({ name: 'testId', required: true })
  @ApiParam({ name: 'questionId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question deleted successfully',
  })
  async removeQuestion(
    @Param('testId') testId: string,
    @Param('questionId') questionId: string,
  ) {
    await this.questionsService.remove(questionId);
    const test = await this.testsService.findOne(testId);

    if (test) {
      test.questions = test.questions.filter(
        (q) => q.toString() !== questionId,
      );
      await test.save();
    }

    return {
      status: HttpStatus.OK,
      message: 'Question deleted successfully',
    };
  }

  @Get(':id/download/excel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download test as Excel' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file generated successfully',
  })
  @SetMetadata('permissions', ['download_tests'])
  async downloadExcel(@Param('id') id: string, @Res() res: Response) {
    const test = await this.testsService.findOne(id);
    if (!test) {
      return res.status(HttpStatus.EXPECTATION_FAILED).json({
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Test not found',
      });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Test');

    worksheet.columns = [
      { header: 'Question', key: 'question', width: 50 },
      { header: 'Options', key: 'options', width: 50 },
    ];

    for (const questionId of test.questions) {
      const _quest: any = questionId;
      const question = await this.questionsService.findOne(
        _quest._id.toString(),
      );

      if (!question) {
        continue;
      }

      const $ = cheerio.load(question.text);
      const images: { imgTag: string; imageId: number }[] = [];
      const imgElements = $('img').toArray();
      for (const img of imgElements) {
        const imgUrl = $(img).attr('src');
        if (imgUrl) {
          const response = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
          });
          const imageId = workbook.addImage({
            buffer: response.data,
            extension: 'png',
          });
          images.push({ imgTag: $.html(img), imageId });
          $(img).replaceWith(`{img-${imageId}}`);
        }
      }

      const questionText = $.html();

      const row = worksheet.addRow({
        question: htmlToText.convert(questionText),
        options: question.options
          .map(
            (option) =>
              `${htmlToText.convert(option.text)} (${option.isCorrect ? 'Correct' : 'Incorrect'})`,
          )
          .join(', '),
      });

      images.forEach(({ imgTag, imageId }) => {
        const cell = worksheet.getCell(`A${row.number}`);
        if (typeof cell.value === 'string') {
          cell.value = cell.value.replace(`{img-${imageId}}`, '');
        }
        worksheet.addImage(imageId, {
          tl: { col: 0, row: row.number - 1 },
          ext: { width: 100, height: 100 },
        });
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=test-${id}.xlsx`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Get(':id/download/pdf')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download test as PDF' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF file generated successfully',
  })
  @SetMetadata('permissions', ['download_tests'])
  async downloadPDF(@Param('id') id: string, @Res() res: Response) {
    const test = await this.testsService.findOne(id);
    if (!test) {
      return res.status(HttpStatus.EXPECTATION_FAILED).json({
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Test not found',
      });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=test-${id}.pdf`);

    doc.pipe(res);

    doc.fontSize(20).text(htmlToText.convert(test.title), { align: 'center' });
    doc.moveDown();

    for (const questionId of test.questions) {
      const _quest: any = questionId;
      const question = await this.questionsService.findOne(
        _quest._id.toString(),
      );

      if (!question) {
        continue;
      }

      const $ = cheerio.load(question.text);

      const imgElements = $('img').toArray();
      const images: any[] = [];

      for (const img of imgElements) {
        const imgUrl = $(img).attr('src');
        if (imgUrl) {
          const response = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
          });
          const imgBuffer = Buffer.from(response.data, 'binary');
          images.push({ imgTag: $.html(img), imgBuffer });
          $(img).replaceWith(`{img-${imgBuffer.toString('base64')}}`);
        }
      }

      const questionText = $.html();

      const parts = questionText.split(/(\{img-[^}]+\})/g);
      parts.forEach((part) => {
        const imgMatch = part.match(/\{img-([^}]+)\}/);
        if (imgMatch) {
          const imgBuffer = Buffer.from(imgMatch[1], 'base64');
          doc.image(imgBuffer);
        } else {
          doc.fontSize(14).text(htmlToText.convert(part));
        }
      });
      doc.moveDown();

      question.options.forEach((option) => {
        doc
          .fontSize(12)
          .text(
            `- ${htmlToText.convert(option.text)} (${option.isCorrect ? 'Correct' : 'Incorrect'})`,
          );
      });

      doc.moveDown();
    }

    doc.end();
    doc.on('finish', () => {
      res.end();
    });
  }

  @Post(':testId/upload-questions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a file to extract MCQs and save to database',
  })
  @ApiParam({ name: 'testId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Questions extracted and saved successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid file type or extraction failed',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new Error('Invalid file type. Only PDF and DOCX are allowed.'),
            false,
          );
        }
      },
    }),
  )
  async uploadQuestions(
    @Param('testId') testId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const result = await this.testsService.extractAndSaveQuestions(
        testId,
        file.buffer,
        file.mimetype,
      );
      return {
        status: HttpStatus.OK,
        message: 'Questions extracted and saved successfully',
        data: result,
      };
    } catch (error) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Failed to extract and save questions',
        error: error.message,
      };
    }
  }
}
