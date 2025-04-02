import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Test, TestType } from './schemas/test.schema';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth'; // Replace docx4js with mammoth
import { OpenAI } from 'openai'; // Corrected import
import { QuestionsService } from 'src/questions/questions.service'; // Import QuestionsService
import { OptionDto } from 'src/questions/dto/create-question.dto';

@Injectable()
export class TestsService {
  constructor(
    @InjectModel(Test.name) private testModel: Model<Test>,
    private readonly questionsService: QuestionsService, // Inject QuestionsService
  ) {}

  async create(createTestDto: CreateTestDto): Promise<Test> {
    const createdTest = new this.testModel(createTestDto);
    return createdTest.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ tests: Test[]; total: number }> {
    const filter = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const tests = await this.testModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('subject')
      .populate('topic')
      .exec();
    const total = await this.testModel.countDocuments(filter);
    return { tests, total };
  }

  async findAllTests(
    subjectId: string,
    topicId: string,
  ): Promise<{ mockTests: Test[]; otherTests: Test[] }> {
    const mockTests = await this.testModel
      .find({ subject: subjectId, testType: TestType.MOCK })
      .populate('subject')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();

    const otherTests = await this.testModel
      .find({ topic: topicId, testType: { $ne: TestType.MOCK } })
      .populate('topic')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();

    return { mockTests, otherTests };
  }

  async findAllMockTests(subject: string): Promise<Test[]> {
    return this.testModel
      .find({ subject, testType: TestType.MOCK })
      .populate('subject')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();
  }

  async findTestsByTopic(topic: string): Promise<Test[]> {
    return this.testModel
      .find({ topic })
      .populate('topic')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();
  }

  async findOne(id: string): Promise<Test | null> {
    return this.testModel
      .findById(id)
      .populate('topic')
      .populate({
        path: 'questions',
        model: 'Question',
      })
      .exec();
  }

  // Find tests by subject
  async findTestsBySubject(subject: string): Promise<Test[]> {
    return this.testModel
      .find({
        subject,
      })
      .exec();
  }

  async update(id: string, updateTestDto: UpdateTestDto): Promise<Test | null> {
    return this.testModel
      .findByIdAndUpdate(id, updateTestDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<void> {
    await this.testModel.findByIdAndDelete(id).exec();
  }

  async extractAndSaveQuestions(
    testId: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<any> {
    let extractedText = '';

    try {
      if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        extractedText = pdfData.text;
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value; // Extracted text is in the 'value' property
        } catch (mammothError) {
          console.error('Error extracting text from .docx file using mammoth:', mammothError);
          throw new BadRequestException('Failed to extract text from .docx file');
        }
      } else {
        throw new BadRequestException('Unsupported file type');
      }
    } catch (error) {
      throw new BadRequestException('Failed to extract text from file');
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const jsonSchema = {
      type: 'object',
      properties: {
        mcqs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    isCorrect: { type: 'boolean' },
                  },
                  required: ['text', 'isCorrect'],
                },
              },
              answer: { type: 'string' },
              reasoning: { type: 'string' },
            },
            required: ['question', 'options', 'answer', 'reasoning'],
          },
        },
      },
      required: ['mcqs'],
    };

    let structuredData: any;
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4', // Attempt to use gpt-4
        messages: [
          {
            role: 'system',
            content: `Extract all multiple-choice questions (MCQs) from the provided text and always return them in JSON format. Ensure that:
                      - Math equations are in LaTeX format (surrounded by dollar signs $ for inline equations).
                      - Each MCQ contains a "question", "options", "answer", and "reasoning".`,
          },
          {
            role: 'user',
            content: extractedText,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'validate_json',
              description: 'Validate JSON format',
              parameters: jsonSchema,
              strict: true,
            },
          },
        ],
        tool_choice: {
          type: 'function',
          function: {
            name: 'validate_json',
          },
        },
      });

      structuredData = JSON.parse(
        response.choices[0]?.message?.content || '{}',
      );

      console.log('Structured Data:', structuredData);

      structuredData = this.validateJsonArguments(structuredData, jsonSchema);
    } catch (error) {
      console.error('Error processing text with OpenAI API:', error); // Log error details

      if (error.message.includes('404') && error.message.includes('gpt-4')) {
        console.warn('Falling back to gpt-3.5-turbo model...');
        try {
          const fallbackResponse = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo', // Fallback to gpt-3.5-turbo
            messages: [
              {
                role: 'system',
                content: `Extract all multiple-choice questions (MCQs) from the provided text and always return them in JSON format. Ensure that:
                          - Math equations are in LaTeX format (surrounded by dollar signs $ for inline equations).
                          - Each MCQ contains a "question", "options", "answer", and "reasoning".`,
              },
              {
                role: 'user',
                content: extractedText,
              },
            ],
            tools: [
              {
                type: 'function',
                function: {
                  name: 'validate_json',
                  description: 'Validate JSON format',
                  parameters: jsonSchema,
                  strict: true,
                },
              },
            ],
            tool_choice: {
              type: 'function',
              function: {
                name: 'validate_json',
              },
            },
          });

          structuredData = JSON.parse(
            fallbackResponse.choices[0]?.message?.content || '{}',
          );

          console.log('Structured Data (Fallback):', structuredData);

          structuredData = this.validateJsonArguments(structuredData, jsonSchema);
        } catch (fallbackError) {
          console.error('Error processing text with fallback model:', fallbackError);
          throw new BadRequestException('Failed to process text with OpenAI API (fallback model)');
        }
      } else {
        throw new BadRequestException('Failed to process text with OpenAI API');
      }
    }

    if (!structuredData || !Array.isArray(structuredData.mcqs)) {
      throw new BadRequestException('Invalid response from OpenAI API');
    }

    const test = await this.findOne(testId);
    if (!test) {
      throw new BadRequestException('Test not found');
    }

    for (const mcq of structuredData.mcqs) {
      const options: OptionDto[] = mcq.options.map((option) => ({
        text: option.text,
        isCorrect: option.isCorrect,
      }));

      const question = await this.questionsService.create({
        text: mcq.question,
        corAnsExp: mcq.reasoning,
        options: options,
      });

      test.questions.push(question._id as MongooseSchema.Types.ObjectId);
    }

    await test.save();

    return { questionsAdded: structuredData.mcqs.length };
  }

  private validateJsonArguments(rawArguments: string, schema: any): any {
    try {
      const parsedArguments = JSON.parse(rawArguments);

      const Ajv = require('ajv');
      const ajv = new Ajv();
      const validate = ajv.compile(schema);

      if (!validate(parsedArguments)) {
        throw new Error('Validation failed');
      }

      return parsedArguments;
    } catch (error) {
      throw new BadRequestException('Invalid arguments generated by OpenAI');
    }
  }
}
