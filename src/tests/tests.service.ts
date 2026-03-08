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
import { MathMLToLaTeX } from 'mathml-to-latex'; // Library to convert MathML to LaTeX

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
    let rawText = '';

    try {
      if (mimeType === 'application/pdf') {
        const pdfData = await pdfParse(fileBuffer);
        rawText = pdfData.text;
      } else if (
        mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          rawText = result.value; // Extracted text is in the 'value' property
        } catch (mammothError) {
          console.error(
            'Error extracting text from .docx file using mammoth:',
            mammothError,
          );
          throw new BadRequestException(
            'Failed to extract text from .docx file',
          );
        }
      } else {
        throw new BadRequestException('Unsupported file type');
      }
    } catch (error) {
      throw new BadRequestException('Failed to extract text from file');
    }

    // Step 2: Send cleaned data to GPT-4 for better structuring
    const formattedMcqs = await this.getStructuredMCQsFromGPT(rawText);

    if (!formattedMcqs || !Array.isArray(formattedMcqs.mcqs)) {
      throw new BadRequestException('Invalid response from OpenAI API');
    }

    const test = await this.findOne(testId);
    if (!test) {
      throw new BadRequestException('Test not found');
    }

    for (const mcq of formattedMcqs.mcqs) {
      // Wrap LaTeX in dollar signs for mcq.question
      mcq.question = this.wrapLatexInDollarSigns(mcq.question);

      const options: OptionDto[] = mcq.options
        // .filter((opt) => opt.text && opt.isCorrect !== undefined) // Ensure options have text and isCorrect
        .map((option) => ({
          text: this.wrapLatexInDollarSigns(option.text),
          isCorrect: false,
          // isCorrect: option.isCorrect,
        }));

      const question = await this.questionsService.create({
        text: mcq.question,
        // corAnsExp: mcq.reasoning,
        corAnsExp: '',
        options: options,
      });

      test.questions.push(question._id as MongooseSchema.Types.ObjectId);
    }

    await test.save();

    return { questionsAdded: formattedMcqs.mcqs.length };
  }

  // Utility method to wrap LaTeX in dollar signs
  private wrapLatexInDollarSigns(text: string): string {
    const latexRegex =
      /\\[a-zA-Z]+|{[^{}]*}|\\frac|\\sqrt|\\begin|\\end|\\[()[\]]/; // Detect LaTeX patterns
    if (
      latexRegex.test(text) &&
      !text.startsWith('$$') &&
      !text.endsWith('$$')
    ) {
      return `$$${text}$$`;
    }
    return text;
  }

  private async getStructuredMCQsFromGPT(text: string): Promise<any> {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const jsonSchema = {
      type: 'object',
      additionalProperties: false, // Disallow extra properties
      properties: {
        mcqs: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false, // Disallow extra properties in MCQ objects
            properties: {
              question: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false, // Disallow extra properties in options
                  properties: {
                    text: { type: 'string' },
                    // isCorrect: { type: 'boolean' },
                  },
                  required: ['text'],
                  // required: ['text', 'isCorrect'],
                },
              },
              // solution: { type: 'string' },
              // reasoning: { type: 'string' },
            },
            required: ['question', 'options'],
            // required: ['question', 'options', 'solution', 'reasoning'],
          },
        },
      },
      required: ['mcqs'],
    };

    // Calculate the token count of the input text
    const tokenCount = this.calculateTokenCount(text);

    // Dynamically select the model based on the token count
    let selectedModel = 'gpt-3.5-turbo'; // Default to a cheaper model
    let maxModelTokens = 4096; // Default max tokens for gpt-3.5-turbo
    if (tokenCount > 3000 && tokenCount <= 8000) {
      selectedModel = 'gpt-4o-mini'; // Use GPT-4o-mini for medium-length text
      maxModelTokens = 8192; // Max tokens for gpt-4o-mini
    } else if (tokenCount > 8000) {
      selectedModel = 'gpt-4o'; // Use GPT-4o for very large text
      maxModelTokens = 16384; // Max tokens for gpt-4o
    }

    // Calculate max_tokens for the response
    const maxTokensForResponse = Math.max(
      maxModelTokens - tokenCount - 500,
      1000,
    ); // Reserve 500 tokens for system/user messages

    try {
      const response = await openai.chat.completions.create({
        model: selectedModel,
        max_tokens: maxTokensForResponse,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You will extract MCQs from the provided text. Follow this structured format:
                      - **Question:** Extract the MCQ question. The question can be plain text, a mix of text and math equations, or consist solely of math equations.
                      - **Options:** Extract all options (A, B, C, D).
                      - **Math Equations:** If there is LaTeX math content, ensure it is surrounded by double dollar signs ($$).
                      - Ensure that questions consisting only of math equations are also extracted.`,
          },
          {
            role: 'user',
            content: text,
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

      return JSON.parse(
        response.choices[0]?.message?.tool_calls?.[0]?.function?.arguments ??
          '{}',
      );
    } catch (error) {
      console.error('Error processing text with OpenAI API:', error); // Log error details
      throw new BadRequestException('Failed to process text with OpenAI API');
    }
  }

  // Utility method to calculate token count
  private calculateTokenCount(text: string): number {
    // Approximate token count: 1 token ≈ 4 characters in English text
    return Math.ceil(text.length / 4);
  }
}
