import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Topic } from './schemas/topic.schema';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { FilesService } from '../files/files.service';
import { Subject } from '../subjects/schemas/subject.schema';
import { Package } from '../packages/schemas/package.schema';
import { Test } from 'src/tests/schemas/test.schema';
import { Result } from 'src/results/schemas/result.schema';

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name)
    private topicModel: Model<Topic>,
    @InjectModel(Subject.name)
    private subjectModel: Model<Subject>,
    @InjectModel(Package.name)
    private packageModel: Model<Package>,
    @InjectModel(Test.name)
    private testModel: Model<Test>,
    @InjectModel(Result.name)
    private resultModel: Model<Result>,
    private readonly filesService: FilesService,
  ) {}

  async create(createTopicDto: CreateTopicDto): Promise<Topic> {
    const createdTopic = new this.topicModel(createTopicDto);
    return createdTopic.save();
  }

  findAll(): Promise<Topic[]> {
    return this.topicModel
      .find({ isDeleted: { $ne: true } })
      .populate({
        path: 'subTopics',
        model: 'Topic',
        match: { isDeleted: { $ne: true } },
        populate: [
          { path: 'studyNotes', model: 'File' },
          { path: 'studyPlans', model: 'File' },
          { path: 'practiceProblems', model: 'File' },
        ],
      })
      .populate('studyNotes')
      .populate('studyPlans')
      .populate('practiceProblems')
      .exec();
  }

  findOne(id: string): Promise<Topic | null> {
    return this.topicModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .populate({
        path: 'subTopics',
        model: 'Topic',
        match: { isDeleted: { $ne: true } },
        populate: [
          { path: 'studyNotes', model: 'File' },
          { path: 'studyPlans', model: 'File' },
          { path: 'practiceProblems', model: 'File' },
        ],
      })
      .populate('studyNotes')
      .populate('studyPlans')
      .populate('practiceProblems')
      .exec();
  }

  findWithTestsBySubjectAndPackage(
    subject: string,
    pkg: string,
    isParent: boolean = true,
  ): Promise<Topic[]> {
    return this.topicModel
      .find({ subject, package: pkg, isParent, isDeleted: { $ne: true } })
      .populate('tests')
      .populate({
        path: 'subTopics',
        model: 'Topic',
        match: { isDeleted: { $ne: true } },
        populate: [{ path: 'tests', model: 'Test' }],
      })
      .exec();
  }

  findAllBySubjectAndPackage(
    subject: string,
    pkg: string,
    isParent: boolean = true,
  ): Promise<Topic[]> {
    return this.topicModel
      .find({ subject, package: pkg, isParent, isDeleted: { $ne: true } })
      .populate({
        path: 'subTopics',
        model: 'Topic',
        match: { isDeleted: { $ne: true } },
        populate: [
          { path: 'studyNotes', model: 'File' },
          { path: 'studyPlans', model: 'File' },
          { path: 'practiceProblems', model: 'File' },
        ],
      })
      .populate('studyNotes')
      .populate('studyPlans')
      .populate('practiceProblems')
      .exec();
  }

  async bulkCreateTopics(parentTopics: any): Promise<any[]> {
    const createdTopics: any[] = [];

    for (const code in parentTopics) {
      const topics = parentTopics[code];
      const parentTopic = topics[0];

      const subject = await this.subjectModel.findOne({
        code: parentTopic.subjectCode,
        isDeleted: { $ne: true },
      });
      if (!subject) {
        throw new Error(
          `Subject with code ${parentTopic.subjectCode} not found`,
        );
      }

      const _package = await this.packageModel.findOne({
        code: parentTopic.packageCode,
        isDeleted: { $ne: true },
      });
      if (!_package) {
        throw new Error(
          `Package with code ${parentTopic.packageCode} not found`,
        );
      }

      // Create parent topic with code and title only
      const newParentTopic = new this.topicModel({
        code: parentTopic.code,
        title: parentTopic.title,
        subject: subject._id,
        package: _package._id,
        isParent: true,
      });

      const savedParentTopic = await newParentTopic.save();
      createdTopics.push(savedParentTopic);

      // Create a subtopic for each parent topic with all the content fields
      const studyNotesIds = await this.saveFiles(parentTopic.studyNotes);
      const studyPlansIds = await this.saveFiles(parentTopic.studyPlans);
      const practiceProblemsIds = await this.saveFiles(
        parentTopic.practiceProblems,
      );

      // Use description as subtopic title or fallback to parent title if not provided
      const subtopicTitle = parentTopic.description
        ? parentTopic.description
        : `${parentTopic.title}`;

      const newSubTopic = new this.topicModel({
        code: `-`,
        title: subtopicTitle,
        subject: subject._id,
        package: _package._id,
        introVideoUrls: parentTopic.introVideoUrls,
        studyNotes: studyNotesIds,
        studyPlans: studyPlansIds,
        practiceProblems: practiceProblemsIds,
        isParent: false,
      });

      const savedSubTopic = await newSubTopic.save();

      // Link subtopic to parent
      savedParentTopic.subTopics.push(
        savedSubTopic._id as MongooseSchema.Types.ObjectId,
      );
      await savedParentTopic.save();
      createdTopics.push(savedSubTopic);

      // Process any additional subtopics from the file (if they exist)
      for (let i = 1; i < topics.length; i++) {
        const additionalSubTopic = topics[i];

        const subStudyNotesIds = await this.saveFiles(
          additionalSubTopic.studyNotes,
        );
        const subStudyPlansIds = await this.saveFiles(
          additionalSubTopic.studyPlans,
        );
        const subPracticeProblemsIds = await this.saveFiles(
          additionalSubTopic.practiceProblems,
        );

        // Use description as subtopic title or code as fallback
        const addSubtopicTitle = additionalSubTopic.description
          ? additionalSubTopic.description
          : `${additionalSubTopic.code}-content`;

        const newAdditionalSubTopic = new this.topicModel({
          code: additionalSubTopic.code,
          title: addSubtopicTitle,
          subject: subject._id,
          package: _package._id,
          introVideoUrls: additionalSubTopic.introVideoUrls,
          studyNotes: subStudyNotesIds,
          studyPlans: subStudyPlansIds,
          practiceProblems: subPracticeProblemsIds,
          isParent: false,
        });

        const savedAdditionalSubTopic = await newAdditionalSubTopic.save();
        savedParentTopic.subTopics.push(
          savedAdditionalSubTopic._id as MongooseSchema.Types.ObjectId,
        );
        await savedParentTopic.save();
        createdTopics.push(savedAdditionalSubTopic);
      }
    }

    return createdTopics;
  }

  private async saveFiles(
    urls: string[],
  ): Promise<MongooseSchema.Types.ObjectId[]> {
    const fileIds: any[] = [];
    for (const url of urls) {
      const fileType = url.split('.').pop();
      const fileName = url.split('/').pop();
      const file = await this.filesService.create({
        fileName: fileName ? fileName : '',
        fileType: fileType ? fileType : '',
        fileUrl: url,
      });
      fileIds.push(file._id);
    }
    return fileIds;
  }

  update(id: string, updateTopicDto: UpdateTopicDto): Promise<Topic | null> {
    return this.topicModel
      .findOneAndUpdate(
        { _id: id, isDeleted: { $ne: true } },
        updateTopicDto,
        { new: true },
      )
      .exec();
  }

  private async collectTopicTreeIds(rootTopicId: string): Promise<string[]> {
    const collected = new Set<string>();
    const queue: string[] = [rootTopicId];

    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (collected.has(current)) {
        continue;
      }
      collected.add(current);

      const topic = await this.topicModel
        .findOne({ _id: current, isDeleted: { $ne: true } })
        .select('subTopics')
        .lean();

      if (!topic?.subTopics?.length) {
        continue;
      }

      for (const subTopicId of topic.subTopics) {
        queue.push(String(subTopicId));
      }
    }

    return Array.from(collected);
  }

  async remove(
    id: string,
    confirmed = false,
  ): Promise<{ deleted: true } | { requiresConfirmation: true; message: string; count: number }> {
    const topic = await this.topicModel
      .findOne({ _id: id, isDeleted: { $ne: true } })
      .lean();
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }

    const topicTreeIds = await this.collectTopicTreeIds(id);
    const testsInTree = await this.testModel
      .find({ topic: { $in: topicTreeIds }, isDeleted: { $ne: true } })
      .select('_id')
      .lean();
    const testIds = testsInTree.map((test) => test._id);

    const resultCount =
      testIds.length > 0
        ? await this.resultModel.countDocuments({ test: { $in: testIds } })
        : 0;

    if (resultCount > 0 && !confirmed) {
      return {
        requiresConfirmation: true,
        message:
          'This topic tree includes tests with student results. Deleting will archive topics/tests while keeping report history intact.',
        count: resultCount,
      };
    }

    await this.topicModel
      .updateMany(
        { _id: { $in: topicTreeIds } },
        { isDeleted: true, deletedAt: new Date() },
      )
      .exec();

    if (testIds.length > 0) {
      await this.testModel
        .updateMany(
          { _id: { $in: testIds } },
          { isDeleted: true, deletedAt: new Date() },
        )
        .exec();
    }

    return { deleted: true };
  }

  async findDeleted(): Promise<Topic[]> {
    return this.topicModel
      .find({ isDeleted: true })
      .populate('subject')
      .populate('package')
      .sort({ deletedAt: -1 })
      .exec();
  }

  async restore(id: string): Promise<Topic | null> {
    return this.topicModel
      .findByIdAndUpdate(
        id,
        { isDeleted: false, deletedAt: null },
        { new: true },
      )
      .exec();
  }
}
