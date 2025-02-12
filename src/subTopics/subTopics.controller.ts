import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  // Delete,
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
import { SubTopicsService } from './subTopics.service';
import { UpdateSubTopicDto } from './dto/update-subTopic.dto';

@ApiTags('subTopics')
@Controller('subTopics')
export class SubTopicsController {
  constructor(private readonly subTopicsService: SubTopicsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subTopic by ID' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubTopic retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.EXPECTATION_FAILED,
    description: 'SubTopic not found',
  })
  async findOne(@Param('id') id: string) {
    const subTopic = await this.subTopicsService.findOne(id);
    if (!subTopic) {
      return {
        status: HttpStatus.EXPECTATION_FAILED,
        message: 'SubTopic not found',
      };
    }
    return {
      status: HttpStatus.OK,
      message: 'SubTopic retrieved successfully',
      data: subTopic,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subTopic' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateSubTopicDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'SubTopic updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSubTopicDto: UpdateSubTopicDto,
  ) {
    const updatedSubTopic = await this.subTopicsService.update(
      id,
      updateSubTopicDto,
    );
    return {
      status: HttpStatus.OK,
      message: 'SubTopic updated successfully',
      data: updatedSubTopic,
    };
  }

  // @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @ApiOperation({ summary: 'Delete a subTopic' })
  // @ApiParam({ name: 'id', required: true })
  // @ApiResponse({
  //   status: HttpStatus.OK,
  //   description: 'SubTopic deleted successfully',
  // })
  // async remove(@Param('id') id: string) {
  //   await this.subTopicsService.remove(id);
  //   return {
  //     status: HttpStatus.OK,
  //     message: 'SubTopic deleted successfully',
  //   };
  // }
}
