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
import * as htmlToText from 'html-to-text';
import axios from 'axios';
import { FileInterceptor } from '@nestjs/platform-express';
import { jsPDF } from 'jspdf';

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

      // Process the question text to find LaTeX equations
      let questionText = question.text;

      // Extract LaTeX expressions enclosed in dollar signs
      const latexExpressions = questionText.match(/\$(.*?)\$/g);
      const latexImages: { latexMarker: string; imageId: number }[] = [];

      // If LaTeX expressions are found, convert them to images
      if (latexExpressions) {
        for (let i = 0; i < latexExpressions.length; i++) {
          const latexExpression = latexExpressions[i];
          const latex = latexExpression.slice(1, -1); // Remove enclosing $ symbols

          try {
            // Use a LaTeX to PNG conversion API (CodeCogs)
            const response = await axios.get(
              `https://latex.codecogs.com/png.latex?${encodeURIComponent(latex)}`,
              { responseType: 'arraybuffer' },
            );

            const imageId = workbook.addImage({
              buffer: response.data,
              extension: 'png',
            });

            latexImages.push({ latexMarker: latexExpression, imageId });

            // Replace the LaTeX expression with a marker
            questionText = questionText.replace(
              latexExpression,
              `{latex-${imageId}}`,
            );
          } catch (error) {
            console.error(`Failed to convert LaTeX: ${latex}`, error);
          }
        }
      }

      // Process options for LaTeX expressions
      const processedOptions = await Promise.all(
        question.options.map(async (option) => {
          let optionText = option.text;
          const optionLatexExpressions = optionText.match(/\$(.*?)\$/g);

          if (optionLatexExpressions) {
            let processedOptionText = optionText;
            for (const latexExpr of optionLatexExpressions) {
              processedOptionText = processedOptionText.replace(
                latexExpr,
                latexExpr.slice(1, -1), // Simply remove $ symbols for display in Excel
              );
            }
            return `${htmlToText.convert(processedOptionText)} (${option.isCorrect ? 'Correct' : 'Incorrect'})`;
          }

          return `${htmlToText.convert(option.text)} (${option.isCorrect ? 'Correct' : 'Incorrect'})`;
        }),
      );

      const row = worksheet.addRow({
        question: htmlToText.convert(questionText),
        options: processedOptions.join(', '),
      });

      // Add the LaTeX images to the cell
      latexImages.forEach(({ latexMarker, imageId }) => {
        const cell = worksheet.getCell(`A${row.number}`);
        if (typeof cell.value === 'string') {
          cell.value = cell.value.replace(`{latex-${imageId}}`, '');
        }
        worksheet.addImage(imageId, {
          tl: { col: 0, row: row.number - 1 },
          ext: { width: 100, height: 50 }, // Adjust size as needed for equations
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

    const doc = new jsPDF();
    let yPosition = 20;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Title
    doc.setFontSize(20);
    doc.text(htmlToText.convert(test.title), pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    let questionNumber = 1;
    for (const questionId of test.questions) {
      const _quest: any = questionId;
      const question = await this.questionsService.findOne(_quest._id.toString());

      if (!question) continue;

      // Check if we need a new page
      if (yPosition > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Process LaTeX in question text
      let questionText = question.text;
      const latexExpressions = questionText.match(/\$(.*?)\$/g);

      if (latexExpressions) {
        for (const latexExpr of latexExpressions) {
          const latex = latexExpr.slice(1, -1);
          try {
            const response = await axios.get(
              `https://latex.codecogs.com/png.latex?${encodeURIComponent(latex)}`,
              { responseType: 'arraybuffer' },
            );

            // Convert image to base64
            const base64Image = Buffer.from(response.data).toString('base64');
            
            // Add image to PDF
            doc.addImage(
              `data:image/png;base64,${base64Image}`,
              'PNG',
              margin,
              yPosition,
              50,
              20
            );
            yPosition += 25;

            // Replace LaTeX in text
            questionText = questionText.replace(latexExpr, '');
          } catch (error) {
            console.error(`Failed to convert LaTeX: ${latex}`, error);
          }
        }
      }

      // Add question text
      doc.setFontSize(12);
      doc.text(`${questionNumber}. ${htmlToText.convert(questionText)}`, margin, yPosition);
      yPosition += 10;

      // Process options
      for (const option of question.options) {
        if (yPosition > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPosition = 20;
        }

        let optionText = option.text;
        const optionLatexExpressions = optionText.match(/\$(.*?)\$/g);

        if (optionLatexExpressions) {
          for (const latexExpr of optionLatexExpressions) {
            const latex = latexExpr.slice(1, -1);
            try {
              const response = await axios.get(
                `https://latex.codecogs.com/png.latex?${encodeURIComponent(latex)}`,
                { responseType: 'arraybuffer' },
              );

              const base64Image = Buffer.from(response.data).toString('base64');
              
              doc.addImage(
                `data:image/png;base64,${base64Image}`,
                'PNG',
                margin + 10,
                yPosition,
                40,
                15
              );
              yPosition += 20;

              // Replace LaTeX in text
              optionText = optionText.replace(latexExpr, '');
            } catch (error) {
              console.error(`Failed to convert LaTeX: ${latex}`, error);
            }
          }
        }

        doc.setFontSize(10);
        doc.text(
          `${option.isCorrect ? '✓' : '○'} ${htmlToText.convert(optionText)}`,
          margin + 5,
          yPosition
        );
        yPosition += 8;
      }

      yPosition += 10;
      questionNumber++;
    }

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=test-${id}.pdf`);
    res.send(pdfBuffer);
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

  @Post('duplicate/:testId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate an existing test with a new topic ID' })
  @ApiParam({
    name: 'testId',
    required: true,
    description: 'ID of the test to duplicate',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topicId: {
          type: 'string',
          description: 'New topic ID for the duplicated test',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test duplicated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Test not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid topic ID',
  })
  async duplicateTest(
    @Param('testId') testId: string,
    @Body('topicId') topicId: string,
  ) {
    // Find the original test
    const originalTest = await this.testsService.findOne(testId);
    if (!originalTest) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Test not found',
      };
    }

    // Verify the new topic exists
    const newTopic = await this.topicsService.findOne(topicId);
    if (!newTopic) {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Invalid topic ID',
      };
    }

    // Create new test object with the original test data, but allow MongoDB to generate a new _id
    const duplicateTestDto = new CreateTestDto();
    duplicateTestDto.title = `${originalTest.title}`;
    duplicateTestDto.marksPerQuestion = originalTest.marksPerQuestion;
    duplicateTestDto.testDuration = originalTest.testDuration;
    duplicateTestDto.testType = originalTest.testType;
    duplicateTestDto.topic = topicId as any; // Set the new topic ID
    duplicateTestDto.subject = originalTest.subject as any; // Set the new topic ID

    // Create the duplicated test (with a fresh ObjectId)
    const duplicatedTest = await this.testsService.create(duplicateTestDto);

    // Duplicate the questions - without reusing IDs
    for (const questionId of originalTest.questions) {
      try {
        const _quest: any = questionId;
        const originalQuestion = await this.questionsService.findOne(
          _quest._id.toString(),
        );

        if (originalQuestion) {
          // Create duplicate question without specifying an ID (let MongoDB generate one)
          const duplicateQuestionDto = {
            text: originalQuestion.text,
            options: originalQuestion.options,
            corAnsExp: originalQuestion.corAnsExp,
          };

          const duplicatedQuestion =
            await this.questionsService.create(duplicateQuestionDto);

          // Add question to duplicated test
          duplicatedTest.questions.push(duplicatedQuestion._id as any);
        }
      } catch (error) {
        console.error('Error duplicating question:', error);
        // Continue with the next question even if this one failed
      }
    }

    // Save the duplicated test with questions
    await duplicatedTest.save();

    // Add test to new topic
    newTopic.tests.push(duplicatedTest._id as any);
    await newTopic.save();

    return {
      status: HttpStatus.OK,
      message: 'Test duplicated successfully',
      data: duplicatedTest,
    };
  }
}
