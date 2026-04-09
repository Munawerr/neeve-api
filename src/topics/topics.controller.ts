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
  UseInterceptors,
  UploadedFile,
  Res,
  Query,
  Logger,
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
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Schema as MongooseSchema } from 'mongoose';
import { FilesService } from '../files/files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  private readonly logger = new Logger(TopicsController.name);

  constructor(
    private readonly topicsService: TopicsService,
    private readonly filesService: FilesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new topic' })
  @ApiBody({ type: CreateTopicDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topic created successfully',
  })
  async create(@Body() createTopicDto: CreateTopicDto) {
    const topic = await this.topicsService.create({
      ...createTopicDto,
      isParent: true,
    });
    return {
      status: HttpStatus.OK,
      message: 'Topic created successfully',
      data: topic,
    };
  }

  @Get('subject/:subjectId/package/:packageId/tests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all topics with tests included' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiParam({ name: 'packageId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topics retrieved successfully',
  })
  async findAllWithTests(
    @Param('subjectId') subjectId: string,
    @Param('packageId') packageId: string,
  ) {
    const topics = await this.topicsService.findWithTestsBySubjectAndPackage(
      subjectId,
      packageId,
    );

    const _topics: any[] = [];
    topics.forEach((topic) => {
      topic.toObject().subTopics.forEach((subTopic: any) => {
        topic.tests = [...topic.tests, ...subTopic.tests];
      });

      const topicObject = topic.toObject();
      delete topicObject.subTopics;
      _topics.push(topicObject);
    });

    return {
      status: HttpStatus.OK,
      message: 'Topics retrieved successfully',
      data: _topics,
    };
  }

  @Get('subject/:subjectId/package/:packageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all topics' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiParam({ name: 'packageId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topics retrieved successfully',
  })
  async findAll(
    @Param('subjectId') subjectId: string,
    @Param('packageId') packageId: string,
  ) {
    const topics = await this.topicsService.findAllBySubjectAndPackage(
      subjectId,
      packageId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Topics retrieved successfully',
      data: topics,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a topic by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topic retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Topic not found',
  })
  async findOne(@Param('id') id: string) {
    const topic = await this.topicsService.findOne(id);
    if (!topic) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Topic not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Topic retrieved successfully',
      data: topic,
    };
  }

  @Post('duplicate/:topicId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate an existing topic' })
  @ApiParam({
    name: 'topicId',
    required: true,
    description: 'ID of the topic to duplicate',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        packageId: {
          type: 'string',
          description: 'New package ID for the duplicated topic (optional)',
        },
        subjectId: {
          type: 'string',
          description: 'New subject ID for the duplicated topic (optional)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topic duplicated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Topic not found',
  })
  async duplicateTopic(
    @Param('topicId') topicId: string,
    @Body() body: { packageId?: string; subjectId?: string },
  ) {
    // Find the original topic
    const originalTopic = await this.topicsService.findOne(topicId);
    if (!originalTopic) {
      return {
        status: HttpStatus.NOT_FOUND,
        message: 'Topic not found',
      };
    }

    // Extract the original topic data
    const topicData = originalTopic.toObject();

    // Create new topic object with the original topic data
    const duplicateTopicDto = new CreateTopicDto();
    duplicateTopicDto.title = `${topicData.title}`;
    duplicateTopicDto.code = `${topicData.code}`;

    // Ensure we're using string IDs, not object references, with proper null checks
    duplicateTopicDto.subject =
      body.subjectId ||
      (topicData.subject
        ? typeof topicData.subject === 'object' && topicData.subject._id
          ? topicData.subject._id.toString()
          : String(topicData.subject)
        : null);

    duplicateTopicDto.package =
      body.packageId ||
      (topicData.package
        ? typeof topicData.package === 'object' && topicData.package._id
          ? topicData.package._id.toString()
          : String(topicData.package)
        : null);

    duplicateTopicDto.introVideoUrls = topicData.introVideoUrls || [];
    duplicateTopicDto.studyNotes = topicData.studyNotes || [];
    duplicateTopicDto.studyPlans = topicData.studyPlans || [];
    duplicateTopicDto.practiceProblems = topicData.practiceProblems || [];

    // Create the duplicated topic
    const duplicatedTopic = await this.topicsService.create({
      ...duplicateTopicDto,
      isParent: topicData.isParent,
    });

    // If the original topic has subtopics, duplicate them as well
    if (topicData.subTopics && topicData.subTopics.length > 0) {
      for (const subTopicId of topicData.subTopics) {
        if (!subTopicId) continue; // Skip if subTopicId is null or undefined

        // Convert the subTopicId to string safely
        let subTopicIdStr;
        try {
          subTopicIdStr =
            typeof subTopicId === 'object'
              ? subTopicId._id
                ? subTopicId._id.toString()
                : null
              : String(subTopicId);
        } catch (error) {
          console.error('Error converting subTopic ID:', error);
          continue; // Skip this subtopic if ID conversion fails
        }

        if (!subTopicIdStr) continue; // Skip if ID conversion resulted in null

        const subTopic = await this.topicsService.findOne(subTopicIdStr);
        if (subTopic) {
          const subTopicData = subTopic.toObject();

          // Create duplicate subtopic
          const duplicateSubTopicDto = new CreateTopicDto();
          duplicateSubTopicDto.title = subTopicData.title;
          duplicateSubTopicDto.code = `${subTopicData.code}`;

          // Ensure we're using string IDs for subjects and packages with proper null checks
          duplicateSubTopicDto.subject =
            body.subjectId ||
            (subTopicData.subject
              ? typeof subTopicData.subject === 'object' &&
                subTopicData.subject._id
                ? subTopicData.subject._id.toString()
                : String(subTopicData.subject)
              : null);

          duplicateSubTopicDto.package =
            body.packageId ||
            (subTopicData.package
              ? typeof subTopicData.package === 'object' &&
                subTopicData.package._id
                ? subTopicData.package._id.toString()
                : String(subTopicData.package)
              : null);

          duplicateSubTopicDto.introVideoUrls =
            subTopicData.introVideoUrls || [];
          duplicateSubTopicDto.studyNotes = subTopicData.studyNotes || [];
          duplicateSubTopicDto.studyPlans = subTopicData.studyPlans || [];
          duplicateSubTopicDto.practiceProblems =
            subTopicData.practiceProblems || [];

          const duplicatedSubTopic = await this.topicsService.create({
            ...duplicateSubTopicDto,
            isParent: false,
          });

          // Add subtopic to duplicated parent topic
          duplicatedTopic.subTopics.push(
            duplicatedSubTopic._id as MongooseSchema.Types.ObjectId,
          );
        }
      }

      // Save the updated parent topic with subtopics
      await duplicatedTopic.save();
    }

    return {
      status: HttpStatus.OK,
      message: 'Topic duplicated successfully',
      data: duplicatedTopic,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a topic' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateTopicDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topic updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTopicDto: UpdateTopicDto,
  ) {
    const updatedTopic = await this.topicsService.update(id, updateTopicDto);
    return {
      status: HttpStatus.OK,
      message: 'Topic updated successfully',
      data: updatedTopic,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a topic' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topic deleted successfully',
  })
  async remove(
    @Param('id') id: string,
    @Query('confirmed') confirmed: string = 'false',
  ) {
    const result = await this.topicsService.remove(id, confirmed === 'true');
    return {
      status: HttpStatus.OK,
      message: 'Topic deleted successfully',
      data: result,
    };
  }

  @Get('archive/deleted')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get deleted topics (super admin only)' })
  async findDeleted() {
    const items = await this.topicsService.findDeleted();
    return {
      status: HttpStatus.OK,
      message: 'Deleted topics retrieved successfully',
      data: { items, total: items.length },
    };
  }

  @Put(':id/restore')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft deleted topic (super admin only)' })
  async restore(@Param('id') id: string) {
    const item = await this.topicsService.restore(id);
    return {
      status: HttpStatus.OK,
      message: 'Topic restored successfully',
      data: item,
    };
  }

  @Post(':id/subTopics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a subtopic to a topic' })
  @ApiBody({ type: CreateTopicDto })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubTopic added successfully',
  })
  async addSubTopic(
    @Param('id') id: string,
    @Body() createTopicDto: CreateTopicDto,
  ) {
    const topic = await this.topicsService.findOne(id);
    if (!topic) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Topic not found',
      };
    }
    const subTopic = await this.topicsService.create({
      ...createTopicDto,
      isParent: false,
    });
    topic.subTopics.push(subTopic._id as MongooseSchema.Types.ObjectId);
    await topic.save();

    return {
      status: HttpStatus.OK,
      message: 'SubTopic added successfully',
      data: subTopic,
    };
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB file size limit
      },
    }),
  )
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create topics from Excel file' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Topics created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'File is missing or invalid',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create topics',
  })
  async bulkCreateTopics(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { subjectId?: string; packageId?: string },
  ) {
    const traceId = `topics-bulk-${Date.now()}`;
    const subjectIdFromBody = body?.subjectId?.trim();
    const packageIdFromBody = body?.packageId?.trim();

    try {
      this.logger.log(`[${traceId}] Bulk upload request received`);
      this.logger.log(
        `[${traceId}] File received: ${file ? 'yes' : 'no'}`,
      );

      // Check if file exists
      if (!file) {
        this.logger.warn(`[${traceId}] Missing file in request`);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'File is required',
        };
      }

      this.logger.log(
        `[${traceId}] File details: name=${file.originalname}, type=${file.mimetype}, size=${file.buffer?.length || 0}`,
      );
      this.logger.log(
        `[${traceId}] Upload context: subjectId=${subjectIdFromBody || 'n/a'}, packageId=${packageIdFromBody || 'n/a'}`,
      );

      // Check if file has buffer
      if (!file.buffer) {
        this.logger.warn(`[${traceId}] File has no buffer`);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid file format',
        };
      }

      // Create a new workbook
      const workbook = new Workbook();

      // Use a try-catch specifically for the file parsing
      try {
        // Load the workbook directly from buffer (cast as any to avoid type issues)
        await workbook.xlsx.load(file.buffer as any);
        this.logger.log(`[${traceId}] Workbook parsed successfully`);
      } catch (parseError) {
        this.logger.error(
          `[${traceId}] Failed to parse Excel file: ${parseError?.message || 'unknown error'}`,
        );
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid Excel file format',
          error: parseError.message,
        };
      }

      const worksheet = workbook.getWorksheet(1);

      const parentTopics: any = {};
      let parsedDataRows = 0;
      let rowsWithoutCode = 0;

      if (worksheet) {
        this.logger.log(
          `[${traceId}] Worksheet found: "${worksheet.name}" with ${worksheet.rowCount || 0} rows`,
        );

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            // Skip header row
            parsedDataRows++;

            const topic = {
              code: this.getCellText(row.getCell(1).value),
              title: this.getCellText(row.getCell(2).value),
              description: this.getCellText(row.getCell(3).value),
              introVideoUrls: this.getDelimitedValues(row.getCell(4).value),
              studyNotes: this.getDelimitedValues(row.getCell(5).value),
              studyPlans: this.getDelimitedValues(row.getCell(6).value),
              practiceProblems: this.getDelimitedValues(row.getCell(7).value),
            };

            const topicCode = topic.code;

            if (topicCode) {
              if (!parentTopics[topicCode]) {
                parentTopics[topicCode] = [];
              }
              parentTopics[topicCode].push(topic);
            } else {
              rowsWithoutCode++;
              this.logger.warn(
                `[${traceId}] Skipping row ${rowNumber} due to empty topic code`,
              );
            }
          }
        });
      } else {
        this.logger.warn(`[${traceId}] Worksheet 1 not found in uploaded workbook`);
      }

      const groupedTopicCodes = Object.keys(parentTopics);
      this.logger.log(
        `[${traceId}] Parsed rows=${parsedDataRows}, grouped topic codes=${groupedTopicCodes.length}, skipped rows without code=${rowsWithoutCode}`,
      );

      const createdTopics = await this.topicsService.bulkCreateTopics(
        parentTopics,
        traceId,
        {
          subjectId: subjectIdFromBody,
          packageId: packageIdFromBody,
        },
      );
      this.logger.log(
        `[${traceId}] Bulk create completed. Created documents=${createdTopics.length}`,
      );

      return {
        status: HttpStatus.OK,
        message: 'Topics created successfully',
        data: {
          parsedRows: parsedDataRows,
          groupedTopicCodes: groupedTopicCodes.length,
          skippedRowsWithoutCode: rowsWithoutCode,
          createdDocuments: createdTopics.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `[${traceId}] Bulk create failed: ${error?.message || 'unknown error'}`,
        error?.stack,
      );
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create topics',
        error: error.message,
      };
    }
  }

  @Get('download/template')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download template for bulk topic creation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Template downloaded successfully',
  })
  async downloadTemplate(@Res() res: Response) {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Topics');

    worksheet.columns = [
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Description (Subtopic Title)', key: 'description', width: 30 },
      {
        header: 'Intro Video URLs (comma separated)',
        key: 'introVideoUrls',
        width: 30,
      },
      {
        header: 'Study Notes URLs (comma separated)',
        key: 'studyNotes',
        width: 30,
      },
      {
        header: 'Study Plans URLs (comma separated)',
        key: 'studyPlans',
        width: 30,
      },
      {
        header: 'Practice Problems URLs (comma separated)',
        key: 'practiceProblems',
        width: 30,
      },
    ];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + 'topics_template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  private getCellText(cellValue: unknown): string {
    if (cellValue == null) {
      return '';
    }

    if (typeof cellValue === 'string' || typeof cellValue === 'number') {
      return String(cellValue).trim();
    }

    if (typeof cellValue === 'object') {
      const valueObject = cellValue as {
        text?: string;
        hyperlink?: string;
        richText?: Array<{ text?: string }>;
        result?: unknown;
      };

      if (valueObject.text) {
        return valueObject.text.trim();
      }

      if (valueObject.hyperlink) {
        return valueObject.hyperlink.trim();
      }

      if (Array.isArray(valueObject.richText)) {
        return valueObject.richText
          .map((part) => part?.text || '')
          .join('')
          .trim();
      }

      if (valueObject.result != null) {
        return String(valueObject.result).trim();
      }
    }

    return String(cellValue).trim();
  }

  private getDelimitedValues(cellValue: unknown): string[] {
    const normalizedValue = this.getCellText(cellValue);
    if (!normalizedValue) {
      return [];
    }

    return normalizedValue
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
}
