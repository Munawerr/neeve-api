import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  SetMetadata,
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
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new assignment for a subject in a package' })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment created successfully' })
  @SetMetadata('permissions', ['edit_topics'])
  async create(@Body() dto: CreateAssignmentDto) {
    const assignment = await this.assignmentsService.create(dto);
    return {
      status: HttpStatus.OK,
      message: 'Assignment created successfully',
      data: assignment,
    };
  }

  @Get('subject/:subjectId/package/:packageId')
  @ApiOperation({ summary: 'Get all assignments for a subject in a package' })
  @ApiParam({ name: 'subjectId', required: true })
  @ApiParam({ name: 'packageId', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignments retrieved successfully' })
  async findBySubjectAndPackage(
    @Param('subjectId') subjectId: string,
    @Param('packageId') packageId: string,
  ) {
    const assignments = await this.assignmentsService.findBySubjectAndPackage(
      subjectId,
      packageId,
    );
    return {
      status: HttpStatus.OK,
      message: 'Assignments retrieved successfully',
      data: assignments,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an assignment' })
  @ApiParam({ name: 'id', required: true })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment deleted successfully' })
  @SetMetadata('permissions', ['edit_topics'])
  async remove(@Param('id') id: string) {
    const result = await this.assignmentsService.remove(id);
    return {
      status: HttpStatus.OK,
      message: 'Assignment deleted successfully',
      data: result,
    };
  }
}
