import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Assignment } from './schemas/assignment.schema';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
  ) {}

  async create(dto: CreateAssignmentDto): Promise<Assignment> {
    const created = new this.assignmentModel(dto);
    return created.save();
  }

  async findBySubjectAndPackage(
    subjectId: string,
    packageId: string,
  ): Promise<Assignment[]> {
    return this.assignmentModel
      .find({
        subject: subjectId,
        package: packageId,
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const existing = await this.assignmentModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();

    if (!existing) {
      throw new NotFoundException('Assignment not found');
    }

    await this.assignmentModel
      .updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() })
      .exec();

    return { deleted: true };
  }
}
