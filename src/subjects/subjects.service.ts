import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subject } from './schemas/subject.schema';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Package } from 'src/packages/schemas/package.schema';
import { Topic } from 'src/topics/schemas/topic.schema';
import { Test } from 'src/tests/schemas/test.schema';
import { LiveClass } from 'src/liveClasses/schemas/liveClass.schema';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectModel(Subject.name) private readonly subjectModel: Model<Subject>,
    @InjectModel(Package.name) private readonly packageModel: Model<Package>,
    @InjectModel(Topic.name) private readonly topicModel: Model<Topic>,
    @InjectModel(Test.name) private readonly testModel: Model<Test>,
    @InjectModel(LiveClass.name)
    private readonly liveClassModel: Model<LiveClass>,
  ) {}

  create(createSubjectDto: CreateSubjectDto): Promise<Subject> {
    const createdSubject = new this.subjectModel(createSubjectDto);
    return createdSubject.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search: string = '',
  ): Promise<{ subjects: Subject[]; total: number }> {
    const filter = search
      ? {
          isDeleted: { $ne: true },
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
          ],
        }
      : { isDeleted: { $ne: true } };

    const subjects = await this.subjectModel
      .find(filter)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    const total = await this.subjectModel.countDocuments(filter);
    return { subjects, total };
  }

  findOne(id: string): Promise<Subject | null> {
    return this.subjectModel.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
  }

  async findByIds(ids: string[]): Promise<Subject[]> {
    if (!Array.isArray(ids) || ids.length === 0) {
      return [];
    }
    const result = await this.subjectModel
      .find({ _id: { $in: ids }, isDeleted: { $ne: true } })
      .exec();
    return result;
  }

  async findAllForDropdown(): Promise<Subject[]> {
    return this.subjectModel.find({ isDeleted: { $ne: true } }, 'title').exec();
  }

  async getAllSubjectsForDropdown(
    courseId?: string,
    instituteId?: string,
  ): Promise<any[]> {
    const query: any = {};

    // Filter by course if provided
    if (courseId) {
      query.course = courseId;
    }

    // Filter by institute if provided
    if (instituteId) {
      query.institute = instituteId;
    }

    const subjects = await this.subjectModel
      .find({ ...query, isDeleted: { $ne: true } })
      .select('_id title description course')
      .sort({ title: 1 })
      .lean()
      .exec();

    return subjects.map((subject) => ({
      _id: subject._id,
      title: subject.title,
      value: subject._id,
      label: subject.title,
    }));
  }

  update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<Subject | null> {
    return this.subjectModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        updateSubjectDto,
        { new: true },
      )
      .exec();
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const subject = await this.subjectModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const [packageRefs, topicRefs, testRefs, liveClassRefs] = await Promise.all([
      this.packageModel
        .find({ subjects: id, isDeleted: { $ne: true } })
        .select('_id code description')
        .lean(),
      this.topicModel
        .find({ subject: id, isDeleted: { $ne: true } })
        .select('_id code title')
        .lean(),
      this.testModel
        .find({ subject: id, isDeleted: { $ne: true } })
        .select('_id title')
        .lean(),
      this.liveClassModel
        .find({ subject: id, isDeleted: { $ne: true } })
        .select('_id title')
        .lean(),
    ]);

    const blockedBy = [
      ...packageRefs.map((pkg) => ({
        type: 'Package',
        id: String(pkg._id),
        name: pkg.description || pkg.code,
        actionHint: 'Edit package and remove this subject.',
      })),
      ...topicRefs.map((topic) => ({
        type: 'Topic',
        id: String(topic._id),
        name: topic.title || topic.code,
        actionHint: 'Delete or reassign dependent topics first.',
      })),
      ...testRefs.map((test) => ({
        type: 'Test',
        id: String(test._id),
        name: test.title,
        actionHint: 'Delete or reassign tests linked to this subject first.',
      })),
      ...liveClassRefs.map((liveClass) => ({
        type: 'LiveClass',
        id: String(liveClass._id),
        name: liveClass.title,
        actionHint: 'Delete or reassign live classes first.',
      })),
    ];

    if (blockedBy.length > 0) {
      throw new ConflictException({
        message:
          'This subject is linked to active resources. Remove these references first.',
        blockedBy,
      });
    }

    await this.subjectModel
      .updateOne({ _id: id }, { isDeleted: true, deletedAt: new Date() })
      .exec();
    return { deleted: true };
  }

  async findDeleted(): Promise<Subject[]> {
    return this.subjectModel.find({ isDeleted: true }).sort({ deletedAt: -1 }).exec();
  }

  async restore(id: string): Promise<Subject | null> {
    return this.subjectModel
      .findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true },
      )
      .exec();
  }
}
