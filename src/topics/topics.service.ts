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
    const upsertedTopics: any[] = [];
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

      const incomingCode = String(parentTopic.code || '').trim();
      const incomingTitle = String(parentTopic.title || '').trim();
      const incomingDescription = String(parentTopic.description || '').trim();

      let savedParentTopic = await this.topicModel.findOne({
        code: incomingCode,
        subject: subject._id,
        package: _package._id,
        isParent: true,
        isDeleted: { $ne: true },
      });

      if (!savedParentTopic) {
        const newParentTopic = new this.topicModel({
          code: incomingCode,
          title: incomingTitle || incomingCode,
          subject: subject._id,
          package: _package._id,
          isParent: true,
        });
        savedParentTopic = await newParentTopic.save();
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Parent topic created for code ${code}. parentTopicId=${savedParentTopic._id}`,
        );
      } else {
        if (incomingTitle) {
          savedParentTopic.title = incomingTitle;
        }
        await savedParentTopic.save();
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Parent topic updated for code ${code}. parentTopicId=${savedParentTopic._id}`,
        );
      }
      upsertedTopics.push(savedParentTopic);

      const introVideoUrls = this.normalizeUrlList(parentTopic.introVideoUrls);
      const studyNoteUrls = this.normalizeUrlList(parentTopic.studyNotes);
      const studyPlanUrls = this.normalizeUrlList(parentTopic.studyPlans);
      const practiceProblemUrls = this.normalizeUrlList(
        parentTopic.practiceProblems,
      );

      const studyNotesIds =
        studyNoteUrls.length > 0 ? await this.saveFiles(studyNoteUrls) : [];
      const studyPlansIds =
        studyPlanUrls.length > 0 ? await this.saveFiles(studyPlanUrls) : [];
      const practiceProblemsIds =
        practiceProblemUrls.length > 0
          ? await this.saveFiles(practiceProblemUrls)
          : [];

      this.logger.log(
        `[${traceId || 'topics-bulk'}] Primary subtopic content parsed for code ${code}. studyNotes=${studyNotesIds.length}, studyPlans=${studyPlansIds.length}, practiceProblems=${practiceProblemsIds.length}, introVideos=${introVideoUrls.length}`,
      );

      const subTopicIds = Array.isArray(savedParentTopic.subTopics)
        ? savedParentTopic.subTopics
        : [];

      let savedSubTopic: Topic | null = null;
      if (subTopicIds.length > 0) {
        savedSubTopic = await this.topicModel.findOne({
          _id: subTopicIds[0],
          isDeleted: { $ne: true },
        });
      }

      if (!savedSubTopic) {
        const fallbackSubtopicTitle =
          incomingDescription || incomingTitle || incomingCode;
        const newSubTopic = new this.topicModel({
          code: `-`,
          title: fallbackSubtopicTitle,
          subject: subject._id,
          package: _package._id,
          introVideoUrls,
          studyNotes: studyNotesIds,
          studyPlans: studyPlansIds,
          practiceProblems: practiceProblemsIds,
          isParent: false,
        });

        savedSubTopic = await newSubTopic.save();
        savedParentTopic.subTopics = [
          savedSubTopic._id as MongooseSchema.Types.ObjectId,
        ];
        await savedParentTopic.save();
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Primary subtopic created for code ${code}. subTopicId=${savedSubTopic._id}`,
        );
      } else {
        if (incomingDescription) {
          savedSubTopic.title = incomingDescription;
        }

        if (introVideoUrls.length > 0) {
          savedSubTopic.introVideoUrls = this.mergeStringArrays(
            savedSubTopic.introVideoUrls,
            introVideoUrls,
          );
        }

        if (studyNotesIds.length > 0) {
          savedSubTopic.studyNotes = this.mergeObjectIdArrays(
            savedSubTopic.studyNotes,
            studyNotesIds,
          );
        }

        if (studyPlansIds.length > 0) {
          savedSubTopic.studyPlans = this.mergeObjectIdArrays(
            savedSubTopic.studyPlans,
            studyPlansIds,
          );
        }

        if (practiceProblemsIds.length > 0) {
          savedSubTopic.practiceProblems = this.mergeObjectIdArrays(
            savedSubTopic.practiceProblems,
            practiceProblemsIds,
          );
        }

        await savedSubTopic.save();
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Primary subtopic updated for code ${code}. subTopicId=${savedSubTopic._id}`,
        );
      }

      upsertedTopics.push(savedSubTopic);

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

        const incomingAdditionalCode = String(
          additionalSubTopic.code || '',
        ).trim();
        let savedAdditionalSubTopic: Topic | null = null;

        if (incomingAdditionalCode) {
          savedAdditionalSubTopic = await this.topicModel.findOne({
            code: incomingAdditionalCode,
            subject: subject._id,
            package: _package._id,
            isParent: false,
            isDeleted: { $ne: true },
          });
        }

        if (!savedAdditionalSubTopic) {
          const newAdditionalSubTopic = new this.topicModel({
            code: incomingAdditionalCode || '-',
            title: addSubtopicTitle,
            subject: subject._id,
            package: _package._id,
            introVideoUrls: this.normalizeUrlList(
              additionalSubTopic.introVideoUrls,
            ),
            studyNotes: subStudyNotesIds,
            studyPlans: subStudyPlansIds,
            practiceProblems: subPracticeProblemsIds,
            isParent: false,
          });
          savedAdditionalSubTopic = await newAdditionalSubTopic.save();
        } else {
          if (addSubtopicTitle) {
            savedAdditionalSubTopic.title = addSubtopicTitle;
          }

          const additionalIntroVideoUrls = this.normalizeUrlList(
            additionalSubTopic.introVideoUrls,
          );
          if (additionalIntroVideoUrls.length > 0) {
            savedAdditionalSubTopic.introVideoUrls = this.mergeStringArrays(
              savedAdditionalSubTopic.introVideoUrls,
              additionalIntroVideoUrls,
            );
          }

          if (subStudyNotesIds.length > 0) {
            savedAdditionalSubTopic.studyNotes = this.mergeObjectIdArrays(
              savedAdditionalSubTopic.studyNotes,
              subStudyNotesIds,
            );
          }

          if (subStudyPlansIds.length > 0) {
            savedAdditionalSubTopic.studyPlans = this.mergeObjectIdArrays(
              savedAdditionalSubTopic.studyPlans,
              subStudyPlansIds,
            );
          }

          if (subPracticeProblemsIds.length > 0) {
            savedAdditionalSubTopic.practiceProblems =
              this.mergeObjectIdArrays(
                savedAdditionalSubTopic.practiceProblems,
                subPracticeProblemsIds,
              );
          }

          await savedAdditionalSubTopic.save();
        }

        const subTopicAlreadyLinked = (savedParentTopic.subTopics || []).some(
          (id) => String(id) === String(savedAdditionalSubTopic?._id),
        );
        if (!subTopicAlreadyLinked) {
          savedParentTopic.subTopics.push(
            savedAdditionalSubTopic._id as MongooseSchema.Types.ObjectId,
          );
          await savedParentTopic.save();
        }

        upsertedTopics.push(savedAdditionalSubTopic);
        this.logger.log(
          `[${traceId || 'topics-bulk'}] Additional subtopic created for code ${code}. subTopicId=${savedAdditionalSubTopic._id}, parentSubTopicCount=${savedParentTopic.subTopics.length}`,
        );
      }

      this.logger.log(
        `[${traceId || 'topics-bulk'}] Completed processing for topic code ${code}`,
      );
    }

    this.logger.log(
      `[${traceId || 'topics-bulk'}] Bulk topic upsert finished. Processed documents=${upsertedTopics.length}`,
    );

    return upsertedTopics;
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

  private mergeStringArrays(existing: string[] | undefined, incoming: string[]): string[] {
    const existingValues = (Array.isArray(existing) ? existing : [])
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);
    const incomingValues = (Array.isArray(incoming) ? incoming : [])
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);

    return Array.from(new Set([...existingValues, ...incomingValues]));
  }

  private mergeObjectIdArrays(
    existing: MongooseSchema.Types.ObjectId[] | undefined,
    incoming: MongooseSchema.Types.ObjectId[],
  ): MongooseSchema.Types.ObjectId[] {
    const merged = new Map<string, MongooseSchema.Types.ObjectId>();

    (Array.isArray(existing) ? existing : []).forEach((id) => {
      merged.set(String(id), id);
    });

    (Array.isArray(incoming) ? incoming : []).forEach((id) => {
      merged.set(String(id), id);
    });

    return Array.from(merged.values());
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
