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

    const topic = await this.topicsService.findOne(test.topic.toString());

    topic?.tests.push(test._id as MongooseSchema.Types.ObjectId);
    topic?.save();

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
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tests retrieved successfully',
  })
  async findAll() {
    const tests = await this.testsService.findAll();
    return {
      status: HttpStatus.OK,
      message: 'Tests retrieved successfully',
      data: tests,
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
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download test as Excel' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file generated successfully',
  })
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
  // @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download test as PDF' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'PDF file generated successfully',
  })
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
}
