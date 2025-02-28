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
  SetMetadata,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LiveClassesService } from './liveClasses.service';
import { CreateLiveClassDto } from './dto/create-liveClass.dto';
import { UpdateLiveClassDto } from './dto/update-liveClass.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('liveClasses')
@Controller('live-classes')
@UseGuards(JwtAuthGuard)
export class LiveClassesController {
  constructor(private readonly liveClassesService: LiveClassesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new live class' })
  @ApiBody({ type: CreateLiveClassDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class created successfully',
  })
  @SetMetadata('permissions', ['edit_live_classes'])
  async create(@Body() createLiveClassDto: CreateLiveClassDto) {
    const liveClass = await this.liveClassesService.create(createLiveClassDto);
    return {
      status: HttpStatus.OK,
      message: 'Live class created successfully',
      data: liveClass,
    };
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all live classes' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live classes retrieved successfully',
  })
  @SetMetadata('permissions', ['view_live_classes'])
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
  ) {
    try {
      const { liveClasses, total } =
        await this.liveClassesService.findAllWithPaging(page, limit, search);
      return {
        status: HttpStatus.OK,
        message: 'Live classes retrieved successfully',
        data: { items: liveClasses, total },
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve live classes',
        error: error.message,
      };
    }
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a live class by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'Live class not found',
  })
  async findOne(@Param('id') id: string) {
    const liveClass = await this.liveClassesService.findOne(id);
    if (!liveClass) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'Live class not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'Live class retrieved successfully',
      data: liveClass,
    };
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a live class' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateLiveClassDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class updated successfully',
  })
  @SetMetadata('permissions', ['edit_live_classes'])
  async update(
    @Param('id') id: string,
    @Body() updateLiveClassDto: UpdateLiveClassDto,
  ) {
    const updatedLiveClass = await this.liveClassesService.update(
      id,
      updateLiveClassDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'Live class updated successfully',
      data: updatedLiveClass,
    };
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a live class' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Live class deleted successfully',
  })
  @SetMetadata('permissions', ['delete_live_classes'])
  async remove(@Param('id') id: string) {
    await this.liveClassesService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Live class deleted successfully',
    };
  }
}
