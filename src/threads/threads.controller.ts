import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpStatus,
  Query,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { ThreadsService } from './threads.service';
import { CreateThreadDto } from './dto/create-thread.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('threads')
@Controller('threads')
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new thread' })
  @ApiBody({ type: CreateThreadDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread created successfully',
  })
  @SetMetadata('permissions', ['create_threads'])
  async create(@Body() createThreadDto: CreateThreadDto) {
    const thread = await this.threadsService.create(createThreadDto);
    return {
      status: HttpStatus.OK,
      message: 'Thread created successfully',
      data: thread,
    };
  }

  @Get('topic/:topicId')
  @ApiOperation({ summary: 'Get all threads by topic ID' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Threads retrieved successfully',
  })
  @SetMetadata('permissions', ['view_threads'])
  async findAll(
    @Param('topicId') topicId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    const { threads, total } = await this.threadsService.findAllByTopicId(
      topicId,
      page,
      limit,
      search,
    );
    return {
      status: HttpStatus.OK,
      message: 'Threads retrieved successfully',
      data: { items: threads, total },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a thread by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Thread not found',
  })
  @SetMetadata('permissions', ['view_threads'])
  async findOne(@Param('id') id: string) {
    const thread = await this.threadsService.findOne(id);
    if (!thread) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Thread not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Thread retrieved successfully',
      data: thread,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a thread' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateThreadDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread updated successfully',
  })
  @SetMetadata('permissions', ['edit_threads'])
  async update(
    @Param('id') id: string,
    @Body() updateThreadDto: UpdateThreadDto,
  ) {
    const updatedThread = await this.threadsService.update(id, updateThreadDto);
    return {
      status: HttpStatus.OK,
      message: 'Thread updated successfully',
      data: updatedThread,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a thread' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Thread deleted successfully',
  })
  @SetMetadata('permissions', ['delete_threads'])
  async remove(@Param('id') id: string) {
    await this.threadsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Thread deleted successfully',
    };
  }
}
