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
import { TopicsService } from './topics.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Schema as MongooseSchema } from 'mongoose';

@ApiTags('topics')
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

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
}
