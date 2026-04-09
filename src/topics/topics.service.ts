import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private readonly logger = new Logger(TopicsService.name);

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

  async bulkCreateTopics(
    parentTopics: any,
    traceId?: string,
    context?: { subjectId?: string; packageId?: string },
  ): Promise<any[]> {
    const createdTopics: any[] = [];
    const topicCodes = Object.keys(parentTopics || {});
    let contextSubject: Subject | null = null;
    let contextPackage: Package | null = null;

    if (context?.subjectId) {
      contextSubject = await this.subjectModel.findOne({
        _id: context.subjectId,
        isDeleted: { $ne: true },
      });
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Context subject lookup: id=${context.subjectId}, found=${contextSubject ? 'yes' : 'no'}`,
      );
      if (!contextSubject) {
        throw new Error(`Subject with id ${context.subjectId} not found`);
      }
    }

    if (context?.packageId) {
      contextPackage = await this.packageModel.findOne({
        _id: context.packageId,
        isDeleted: { $ne: true },
      });
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Context package lookup: id=${context.packageId}, found=${contextPackage ? 'yes' : 'no'}`,
      );
      if (!contextPackage) {
        throw new Error(`Package with id ${context.packageId} not found`);
      }
    }

    this.logger.log(
      `[${traceId || 'topics-bulk'}] Starting bulk topic creation. Parent groups=${topicCodes.length}`,
    );

    for (const code in parentTopics) {
      const topics = parentTopics[code];
      if (!Array.isArray(topics) || topics.length === 0) {
        this.logger.warn(
          `[${traceId || 'topics-bulk'}] Skipping topic code ${code} because grouped rows are empty`,
        );
        continue;
      }

      const parentTopic = topics[0];
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Processing topic code ${code}. Group rows=${topics.length}`,
      );

      const subject = contextSubject
        ? contextSubject
        : await this.subjectModel.findOne({
            code: parentTopic.subjectCode,
            isDeleted: { $ne: true },
          });
      if (!subject) {
        this.logger.error(
          `[${traceId || 'topics-bulk'}] Subject not found for topic code ${code}. subjectCode=${parentTopic.subjectCode}`,
        );
        throw new Error(
          `Subject with code ${parentTopic.subjectCode} not found`,
        );
      }

      const _package = contextPackage
        ? contextPackage
        : await this.packageModel.findOne({
            code: parentTopic.packageCode,
            isDeleted: { $ne: true },
          });
      if (!_package) {
        this.logger.error(
          `[${traceId || 'topics-bulk'}] Package not found for topic code ${code}. packageCode=${parentTopic.packageCode}`,
        );
        throw new Error(
          `Package with code ${parentTopic.packageCode} not found`,
        );
      }

      this.logger.log(
        `[${traceId || 'topics-bulk'}] Subject and package resolved for topic code ${code}. subjectId=${subject._id}, packageId=${_package._id}`,
      );

      // Create parent topic with code and title only
      const newParentTopic = new this.topicModel({
        code: String(parentTopic.code || '').trim(),
        title: String(parentTopic.title || '').trim(),
        subject: subject._id,
        package: _package._id,
        isParent: true,
      });

      const savedParentTopic = await newParentTopic.save();
      createdTopics.push(savedParentTopic);
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Parent topic created for code ${code}. parentTopicId=${savedParentTopic._id}`,
      );

      // Create a subtopic for each parent topic with all the content fields
      const studyNotesIds = await this.saveFiles(parentTopic.studyNotes);
      const studyPlansIds = await this.saveFiles(parentTopic.studyPlans);
      const practiceProblemsIds = await this.saveFiles(
        parentTopic.practiceProblems,
      );
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Primary subtopic content prepared for code ${code}. studyNotes=${studyNotesIds.length}, studyPlans=${studyPlansIds.length}, practiceProblems=${practiceProblemsIds.length}, introVideos=${Array.isArray(parentTopic.introVideoUrls) ? parentTopic.introVideoUrls.length : 0}`,
      );

      // Use description as subtopic title or fallback to parent title if not provided
      const subtopicTitle = parentTopic.description
        ? String(parentTopic.description).trim()
        : `${String(parentTopic.title || '').trim()}`;

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
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Primary subtopic created for code ${code}. subTopicId=${savedSubTopic._id}`,
      );

      // Link subtopic to parent
      savedParentTopic.subTopics.push(
        savedSubTopic._id as MongooseSchema.Types.ObjectId,
      );
      await savedParentTopic.save();
      createdTopics.push(savedSubTopic);
      this.logger.log(
        `[${traceId || 'topics-bulk'}] Linked primary subtopic to parent for code ${code}. parentSubTopicCount=${savedParentTopic.subTopics.length}`,
      );

      // Process any additional subtopics from the file (if they exist)
      for (let i = 1; i < topics.length; i++) {
        const additionalSubTopic = topics[i];
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Processing additional subtopic ${i} for code ${code}`,
        );

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
          ? String(additionalSubTopic.description).trim()
          : `${String(additionalSubTopic.code || '').trim()}-content`;

        const newAdditionalSubTopic = new this.topicModel({
          code: String(additionalSubTopic.code || '').trim(),
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
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Additional subtopic created for code ${code}. subTopicId=${savedAdditionalSubTopic._id}, parentSubTopicCount=${savedParentTopic.subTopics.length}`,
        );
      }

      this.logger.log(
        `[${traceId || 'topics-bulk'}] Completed processing for topic code ${code}`,
      );
    }

    this.logger.log(
      `[${traceId || 'topics-bulk'}] Bulk topic creation finished. Created documents=${createdTopics.length}`,
    );

    return createdTopics;
  }

  private async saveFiles(
    urls: string[] | string | null | undefined,
  ): Promise<MongooseSchema.Types.ObjectId[]> {
    const normalizedUrls = this.normalizeUrlList(urls);
    const fileIds: MongooseSchema.Types.ObjectId[] = [];

    for (const url of normalizedUrls) {
      const fileType = url.split('.').pop();
      const fileName = url.split('/').pop();
      const file = await this.filesService.create({
        fileName: fileName ? fileName : '',
        fileType: fileType ? fileType : '',
        fileUrl: url,
      });
      fileIds.push(file._id as MongooseSchema.Types.ObjectId);
    }
    return fileIds;
  }

  private normalizeUrlList(urls: string[] | string | null | undefined): string[] {
    if (!urls) {
      return [];
    }

    if (Array.isArray(urls)) {
      return urls
        .map((url) => String(url || '').trim())
        .filter((url) => url.length > 0);
    }

    return String(urls)
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
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
