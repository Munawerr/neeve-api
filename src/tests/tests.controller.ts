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
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TopicsService } from 'src/topics/topics.service';
import { Schema as MongooseSchema } from 'mongoose';

@ApiTags('tests')
@Controller('tests')
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly topicsService: TopicsService,
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
}
