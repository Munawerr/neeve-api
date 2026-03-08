import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Result, ResultStatus } from './schemas/result.schema';
import { CreateResultServiceDto } from './dto/create-result.dto';
import { UpdateResultDto } from './dto/update-result.dto';
import { TestType } from 'src/tests/schemas/test.schema';

@Injectable()
export class ResultsService {
  constructor(@InjectModel(Result.name) private resultModel: Model<Result>) {}

  // Create a new result
  async create(createResultDto: CreateResultServiceDto): Promise<Result> {
    const createdResult = new this.resultModel(createResultDto);
    return createdResult.save();
  }

  // Find all results
  async findAll(): Promise<Result[]> {
    return this.resultModel.find().exec();
  }

  // Find a result by ID
  async findOne(id: string): Promise<Result | null> {
    return this.resultModel
      .findById(id)
      .populate('test')
      .populate('subject')
      .populate('institute')
      .populate('student')
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find all results for a student
  async findAllByStudentId(student: string): Promise<Result[]> {
    return this.resultModel
      .find({ student })
      .populate('test')
      .populate('subject')
      .populate('institute')
      .populate('student')
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find finished results for a student, subject, and test type
  async findFinishedResults(
    student: string,
    subject: string,
    testType: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({
        student,
        subject,
        status: ResultStatus.FINISHED,
        testType,
      })
      .populate({
        path: 'test',
        model: 'Test',
        // match: { testType },
        populate: [
          { path: 'topic', model: 'Topic' },
          { path: 'subject', model: 'Subject' },
        ],
      })
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find finished results for a student and test type across all subjects
  async findFinishedResultsAllSubjects(
    student: string,
    testType: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({
        student,
        status: ResultStatus.FINISHED,
        testType,
      })
      .populate({
        path: 'test',
        model: 'Test',
        populate: [
          { path: 'topic', model: 'Topic' },
          { path: 'subject', model: 'Subject' },
        ],
      })
      .populate({
        path: 'subject',
        model: 'Subject',
      })
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find finished results for a student and test type
  async findFinishedResultsByStudent(student: string): Promise<Result[]> {
    return this.resultModel
      .find({
        student,
        status: ResultStatus.FINISHED,
        // testType: { $ne: TestType.PRACTICE },
      })
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  async findOneByStudentAndTest(
    studentId: string,
    testId: string,
  ): Promise<Result | null> {
    return this.resultModel
      .findOne({ student: studentId, test: testId })
      .exec();
  }

  // Find all test attempts for a student and specific test
  async findAllAttemptsByStudentAndTest(
    studentId: string,
    testId: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({ student: studentId, test: testId, status: ResultStatus.FINISHED })
      .sort({ finishedAt: -1 }) // Sort by most recent first
      .populate('test')
      .populate('subject')
      .populate('institute')
      .populate('student')
      .populate({
        path: 'questionResults',
        model: 'QuestionResult',
      })
      .exec();
  }

  // Find all finished results for a specific subject and test type
  async findAllFinishedResults(
    subject: string,
    testType: string,
  ): Promise<Result[]> {
    return this.resultModel
      .find({
        subject: subject,
        testType: testType,
        status: ResultStatus.FINISHED,
      })
      .populate('test')
      .populate({
        path: 'questionResults',
        populate: {
          path: 'question',
          populate: {
            path: 'options',
          },
        },
      })
      .exec();
  }

  // Calculate percentile for a student's test result
  async calculatePercentile(
    resultId: string,
    testId: string,
    score: number,
  ): Promise<number> {
    // Get all results for this specific test from all students
    const allTestResults = await this.resultModel
      .find({
        test: testId,
        status: ResultStatus.FINISHED,
        _id: { $ne: resultId }, // Exclude current result
      })
      .exec();

    // Get all scores for this test
    const scores = allTestResults.map((result) => {
      const total = result.marksSummary.totalMarks;
      const obtained = result.marksSummary.obtainedMarks;
      return (obtained / total) * 100;
    });

    // Add current student's score
    scores.push(score);

    // Sort scores in descending order (highest first)
    scores.sort((a, b) => b - a);

    // Find index of current score (0-based index)
    const index = scores.indexOf(score);

    // Calculate percentile: (Position from top / total number of scores) 
    // Add 1 to index to get 1-based position
    const percentile = ((index + 1) / scores.length) * 100;

    return Math.round(percentile);
  }

  // Calculate percentile for a subject
  async calculateSubjectPercentile(
    studentId: string,
    subjectId: string,
    testType: string,
    averageMarks: number,
  ): Promise<number> {
    // Get all results for this subject and test type
    const allResults = await this.resultModel
      .find({
        subject: subjectId,
        testType: testType,
        status: ResultStatus.FINISHED,
        student: { $ne: studentId }, // Exclude current student
      })
      .exec();

    // Group results by student
    const studentResults = allResults.reduce((acc, result) => {
      const studentId = result.student.toString();
      if (!acc[studentId]) {
        acc[studentId] = [];
      }
      acc[studentId].push(result);
      return acc;
    }, {});

    // Calculate average score for each student
    const studentScores = Object.values(studentResults).map(
      (results: Result[]) => {
        const total = results.reduce(
          (sum, result) => sum + result.marksSummary.totalMarks,
          0,
        );
        const obtained = results.reduce(
          (sum, result) => sum + result.marksSummary.obtainedMarks,
          0,
        );
        return (obtained / total) * 100;
      },
    );

    // Add current student's score
    studentScores.push(averageMarks);

    // Sort scores in descending order (highest first)
    studentScores.sort((a, b) => b - a);

    // Find index of current score (0-based index)
    const index = studentScores.indexOf(averageMarks);

    // Calculate percentile: (Position from top / total number of scores)
    // Add 1 to index to get 1-based position
    const percentile = ((index + 1) / studentScores.length) * 100;

    return Math.round(percentile);
  }

  // Calculate overall percentile
  async calculateOverallPercentile(
    studentId: string,
    averageMarks: number,
  ): Promise<number> {
    // Get all results for all students (excluding current student)
    const allResults = await this.resultModel
      .find({
        status: ResultStatus.FINISHED,
        student: { $ne: studentId },
      })
      .exec();

    // Group results by student
    const studentResults = allResults.reduce((acc, result) => {
      const studentId = result.student.toString();
      if (!acc[studentId]) {
        acc[studentId] = [];
      }
      acc[studentId].push(result);
      return acc;
    }, {});

    // Calculate average score for each student
    const studentScores = Object.values(studentResults).map(
      (results: Result[]) => {
        const total = results.reduce(
          (sum, result) => sum + result.marksSummary.totalMarks,
          0,
        );
        const obtained = results.reduce(
          (sum, result) => sum + result.marksSummary.obtainedMarks,
          0,
        );
        return (obtained / total) * 100;
      },
    );

    // Add current student's score
    studentScores.push(averageMarks);

    // Sort scores in descending order (highest first)
    studentScores.sort((a, b) => b - a);

    // Find index of current score (0-based index)
    const index = studentScores.indexOf(averageMarks);

    // Calculate percentile: (Position from top / total number of scores)
    // Add 1 to index to get 1-based position
    const percentile = ((index + 1) / studentScores.length) * 100;

    return Math.round(percentile);
  }

  // Calculate test-specific percentile
  async calculateTestSpecificPercentile(
    testId: string,
    studentScore: number,
  ): Promise<{ percentile: number; rank: number; totalStudents: number }> {
    // Get all finished results for this test
    const allResults = await this.resultModel
      .find({
        test: testId,
        status: ResultStatus.FINISHED,
      })
      .exec();

    // Get all scores for this test
    const scores = allResults.map((result) => ({
      score: (result.marksSummary.obtainedMarks / result.marksSummary.totalMarks) * 100,
    }));

    // Add current score if not already in the list
    if (!scores.some(s => Math.abs(s.score - studentScore) < 0.001)) {
      scores.push({ score: studentScore });
    }

    // Sort scores in descending order (highest first)
    scores.sort((a, b) => b.score - a.score);

    // Find position of current score (0-based index)
    const rank = scores.findIndex(s => Math.abs(s.score - studentScore) < 0.001) + 1;
    const totalStudents = scores.length;

    // Calculate percentile (rank based)
    const percentile = Math.round((rank / totalStudents) * 100);

    return { percentile, rank, totalStudents };
  }

  // Update a result by ID
  async update(
    id: string,
    updateResultDto: UpdateResultDto,
  ): Promise<Result | null> {
    return this.resultModel
      .findByIdAndUpdate(id, updateResultDto, { new: true })
      .exec();
  }

  // Remove a result by ID
  async remove(id: string): Promise<void> {
    await this.resultModel.findByIdAndDelete(id).exec();
  }
}
