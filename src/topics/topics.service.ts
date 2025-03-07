import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Schema as MongooseSchema } from 'mongoose';
import { Topic } from './schemas/topic.schema';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { FilesService } from '../files/files.service';
import { Subject } from '../subjects/schemas/subject.schema';
import { Package } from '../packages/schemas/package.schema';

@Injectable()
export class TopicsService {
  constructor(
    @InjectModel(Topic.name)
    private topicModel: Model<Topic>,
    @InjectModel(Subject.name)
    private subjectModel: Model<Subject>,
    @InjectModel(Package.name)
    private packageModel: Model<Package>,
    private readonly filesService: FilesService,
  ) {}

  async create(createTopicDto: CreateTopicDto): Promise<Topic> {
    const createdTopic = new this.topicModel(createTopicDto);
    return createdTopic.save();
  }

  findAll(): Promise<Topic[]> {
    return this.topicModel
      .find()
      .populate({
        path: 'subTopics',
        model: 'Topic',
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
      .findById(id)
      .populate({
        path: 'subTopics',
        model: 'Topic',
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
      .find({ subject, package: pkg, isParent })
      .populate('tests')
      .populate({
        path: 'subTopics',
        model: 'Topic',
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
      .find({ subject, package: pkg, isParent })
      .populate({
        path: 'subTopics',
        model: 'Topic',
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
      });
      if (!subject) {
        throw new Error(
          `Subject with code ${parentTopic.subjectCode} not found`,
        );
      }

      const _package = await this.packageModel.findOne({
        code: parentTopic.packageCode,
      });
      if (!_package) {
        throw new Error(
          `Package with code ${parentTopic.packageCode} not found`,
        );
      }

      const studyNotesIds = await this.saveFiles(parentTopic.studyNotes);
      const studyPlansIds = await this.saveFiles(parentTopic.studyPlans);
      const practiceProblemsIds = await this.saveFiles(
        parentTopic.practiceProblems,
      );

      const newParentTopic = new this.topicModel({
        code: parentTopic.code,
        title: parentTopic.title,
        subject: subject._id,
        package: _package._id,
        introVideoUrls: parentTopic.introVideoUrls,
        studyNotes: studyNotesIds,
        studyPlans: studyPlansIds,
        practiceProblems: practiceProblemsIds,
      });

      const savedParentTopic = await newParentTopic.save();
      createdTopics.push(savedParentTopic);

      for (let i = 1; i < topics.length; i++) {
        const subTopic = topics[i];

        const subStudyNotesIds = await this.saveFiles(subTopic.studyNotes);
        const subStudyPlansIds = await this.saveFiles(subTopic.studyPlans);
        const subPracticeProblemsIds = await this.saveFiles(
          subTopic.practiceProblems,
        );

        const newSubTopic = new this.topicModel({
          code: subTopic.code,
          title: subTopic.title,
          subject: subject._id,
          package: _package._id,
          introVideoUrls: subTopic.introVideoUrls,
          studyNotes: subStudyNotesIds,
          studyPlans: subStudyPlansIds,
          practiceProblems: subPracticeProblemsIds,
          isParent: false,
        });

        const savedSubTopic = await newSubTopic.save();
        savedParentTopic.subTopics.push(
          savedSubTopic._id as MongooseSchema.Types.ObjectId,
        );
        await savedParentTopic.save();
        createdTopics.push(savedSubTopic);
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
      .findByIdAndUpdate(id, updateTopicDto, { new: true })
      .exec();
  }

  remove(id: string): Promise<Topic | null> {
    return this.topicModel.findByIdAndDelete(id).exec();
  }
}
