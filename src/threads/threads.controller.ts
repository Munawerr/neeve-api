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
  Request,
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
  async create(@Body() createThreadDto: CreateThreadDto, @Request() req) {
    const userId = req.user.userId;
    createThreadDto.user = userId;

    const thread = await this.threadsService.create(createThreadDto);
    return {
      status: HttpStatus.OK,
      message: 'Thread created successfully',
      data: thread,
    };
  }

  @Post('institute')
  @ApiOperation({
    summary: 'Create an institute-restricted thread',
  })
  @ApiBody({ type: CreateThreadDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Institute thread created successfully',
  })
  @SetMetadata('permissions', ['create_threads'])
  async createInstituteThread(
    @Body() createThreadDto: CreateThreadDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    createThreadDto.user = userId;
    createThreadDto.isInstituteOnly = true;

    const thread = await this.threadsService.create(createThreadDto);
    return {
      status: HttpStatus.OK,
      message: 'Institute thread created successfully',
      data: thread,
    };
  }

  @Post('global')
  @ApiOperation({
    summary: 'Get or create a global thread for an institute and class',
  })
  @ApiQuery({ name: 'instituteId', required: true })
  @ApiQuery({ name: 'classId', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Global thread retrieved or created successfully',
  })
  @SetMetadata('permissions', ['create_threads'])
  async findOrCreateGlobalThread(
    @Query('instituteId') instituteId: string,
    @Query('classId') classId: string,
    @Request() req,
  ) {
    const thread = await this.threadsService.findOrCreateGlobalThread(
      instituteId,
      classId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Global thread retrieved or created successfully',
      data: thread,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all threads with pagination and optional filters',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of threads per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search term for thread titles',
  })
  @ApiQuery({
    name: 'isGlobal',
    required: false,
    description: 'Filter for global threads',
  })
  @ApiQuery({
    name: 'isInstituteOnly',
    required: false,
    description: 'Filter for institute-only threads',
  })
  @ApiQuery({
    name: 'institute',
    required: false,
    description: 'Filter by institute ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Threads retrieved successfully',
  })
  @SetMetadata('permissions', ['view_threads'])
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('isGlobal') isGlobal: boolean,
    @Query('isInstituteOnly') isInstituteOnly: boolean,
    @Query('institute') institute: string,
    @Request() req,
  ) {
    const userId = req.user.userId;

    // Parse boolean query parameters
    const parsedIsGlobal = isGlobal === true;
    const parsedIsInstituteOnly = isInstituteOnly === true;

    console.log('Query params:', {
      page,
      limit,
      search,
      isGlobal: parsedIsGlobal,
      isInstituteOnly: parsedIsInstituteOnly,
      institute,
      userId,
    });

    const { threads, total } = await this.threadsService.findAll(
      page,
      limit,
      search,
      userId,
      parsedIsGlobal,
      parsedIsInstituteOnly,
      institute,
    );

    return {
      status: HttpStatus.OK,
      message: 'Threads retrieved successfully',
      data: { items: threads, total },
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
  async findAllByTopicId(
    @Param('topicId') topicId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Request() req,
  ) {
    const userId = req.user.userId;
    const { threads, total } = await this.threadsService.findAllByTopicId(
      topicId,
      page,
      limit,
      search,
      userId,
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
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    const thread = await this.threadsService.findOne(id, userId);
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
    @Request() req,
  ) {
    const userId = req.user.userId;
    const updatedThread = await this.threadsService.update(
      id,
      updateThreadDto,
      userId,
    );
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
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    await this.threadsService.remove(id, userId);
    return {
      status: HttpStatus.OK,
      message: 'Thread deleted successfully',
    };
  }
}
