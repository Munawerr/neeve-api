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

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
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
      topic.toObject().subTopics.forEach((subTopic) => {
        topic.tests = [...topic.tests, ...subTopic.tests];
      });

      const { subTopics, ...rest } = topic.toObject();
      _topics.push(rest);
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
    duplicateTopicDto.subject = body.subjectId || 
      (topicData.subject ? 
        (typeof topicData.subject === 'object' && topicData.subject._id ? 
          topicData.subject._id.toString() : 
          String(topicData.subject)) : 
        null);
        
    duplicateTopicDto.package = body.packageId || 
      (topicData.package ? 
        (typeof topicData.package === 'object' && topicData.package._id ? 
          topicData.package._id.toString() : 
          String(topicData.package)) : 
        null);
        
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
          subTopicIdStr = typeof subTopicId === 'object' ? 
            (subTopicId._id ? subTopicId._id.toString() : null) : 
            String(subTopicId);
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
          duplicateSubTopicDto.subject = body.subjectId || 
            (subTopicData.subject ? 
              (typeof subTopicData.subject === 'object' && subTopicData.subject._id ? 
                subTopicData.subject._id.toString() : 
                String(subTopicData.subject)) : 
              null);
              
          duplicateSubTopicDto.package = body.packageId || 
            (subTopicData.package ? 
              (typeof subTopicData.package === 'object' && subTopicData.package._id ? 
                subTopicData.package._id.toString() : 
                String(subTopicData.package)) : 
              null);
              
          duplicateSubTopicDto.introVideoUrls = subTopicData.introVideoUrls || [];
          duplicateSubTopicDto.studyNotes = subTopicData.studyNotes || [];
          duplicateSubTopicDto.studyPlans = subTopicData.studyPlans || [];
          duplicateSubTopicDto.practiceProblems = subTopicData.practiceProblems || [];

          const duplicatedSubTopic = await this.topicsService.create({
            ...duplicateSubTopicDto,
            isParent: false,
          });

          // Add subtopic to duplicated parent topic
          duplicatedTopic.subTopics.push(duplicatedSubTopic._id as MongooseSchema.Types.ObjectId);
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
  async remove(@Param('id') id: string) {
    await this.topicsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Topic deleted successfully',
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
  async bulkCreateTopics(@UploadedFile() file: Express.Multer.File) {
    try {
      // Add detailed logging to understand what's being received
      console.log('Received upload request');
      console.log('File received:', file ? 'Yes' : 'No');
      
      // Check if file exists
      if (!file) {
        console.log('No file in request');
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'File is required',
        };
      }
      
      console.log('File details:', {
        fieldname: file.fieldname,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.buffer?.length || 0,
      });

      // Check if file has buffer
      if (!file.buffer) {
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
      } catch (parseError) {
        console.error('Error parsing Excel file:', parseError);
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid Excel file format',
          error: parseError.message,
        };
      }
      
      const worksheet = workbook.getWorksheet(1);

      const parentTopics: any = {};

      if (worksheet) {
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 1) {
            // Skip header row
            const topic = {
              code: row.getCell(1).value,
              title: row.getCell(2).value,
              subjectCode: row.getCell(3).value,
              packageCode: row.getCell(4).value,
              description: row.getCell(5).value || '', // Added description (subtopic title)
              introVideoUrls: row.getCell(6).value
                ? row.getCell(6).value?.toString().split(',')
                : [],
              studyNotes: row.getCell(7).value
                ? row.getCell(7).value?.toString().split(',')
                : [],
              studyPlans: row.getCell(8).value
                ? row.getCell(8).value?.toString().split(',')
                : [],
              practiceProblems: row.getCell(9).value
                ? row.getCell(9).value?.toString().split(',')
                : [],
            };

            const topicCode = topic.code?.toString();

            if (topicCode) {
              if (!parentTopics[topicCode]) {
                parentTopics[topicCode] = [];
              }
              parentTopics[topicCode].push(topic);
            }
          }
        });
      }

      await this.topicsService.bulkCreateTopics(parentTopics);

      return {
        status: HttpStatus.OK,
        message: 'Topics created successfully',
      };
    } catch (error) {
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
      { header: 'Subject Code', key: 'subjectCode', width: 20 },
      { header: 'Package Code', key: 'packageCode', width: 20 },
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
}
