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
import { DiscussionsService } from './discussions.service';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('discussions')
@Controller('discussions')
@UseGuards(JwtAuthGuard)
export class DiscussionsController {
  constructor(private readonly discussionsService: DiscussionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new discussion' })
  @ApiBody({ type: CreateDiscussionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion created successfully',
  })
  async create(@Body() createDiscussionDto: CreateDiscussionDto) {
    const discussion =
      await this.discussionsService.create(createDiscussionDto);
    return {
      status: HttpStatus.OK,
      message: 'Discussion created successfully',
      data: discussion,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all discussions' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussions retrieved successfully',
  })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    const discussions = await this.discussionsService.findAll(
      page,
      limit,
      search,
    );
    return {
      status: HttpStatus.OK,
      message: 'Discussions retrieved successfully',
      data: discussions,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a discussion by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Discussion not found',
  })
  async findOne(@Param('id') id: string) {
    const discussion = await this.discussionsService.findOne(id);
    if (!discussion) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Discussion not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Discussion retrieved successfully',
      data: discussion,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a discussion' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateDiscussionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDiscussionDto: UpdateDiscussionDto,
  ) {
    const updatedDiscussion = await this.discussionsService.update(
      id,
      updateDiscussionDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Discussion updated successfully',
      data: updatedDiscussion,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Mark a discussion as deleted' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Discussion marked as deleted successfully',
  })
  @SetMetadata('permissions', ['delete_discussions'])
  async remove(@Param('id') id: string) {
    await this.discussionsService.markAsDeleted(id);
    return {
      status: HttpStatus.OK,
      message: 'Discussion marked as deleted successfully',
    };
  }
}
