import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Report,
  ReportFormat,
  ReportStatus,
  ReportType,
} from '../schemas/report.schema';
import { PdfReportService } from './pdf-report.service';
import { ExcelReportService } from './excel-report.service';
import { Result, ResultStatus } from '../../results/schemas/result.schema';
import { User } from '../../users/schemas/user.schema';
import { Test } from '../../tests/schemas/test.schema';
import { Subject } from '../../subjects/schemas/subject.schema';
import { Course } from '../../courses/schemas/course.schema';
import { Package } from '../../packages/schemas/package.schema';
import { Topic } from '../../topics/schemas/topic.schema';
import { S3Service } from '../../s3/s3.service';
import {
  CourseReportData,
  InstituteReportData,
  OverallReportData,
  TestReportData,
} from '../interfaces/report.interface';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ReportGeneratorService {
  constructor(
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(Result.name) private resultModel: Model<Result>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Test.name) private testModel: Model<Test>,
    @InjectModel(Subject.name) private subjectModel: Model<Subject>,
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Package.name) private packageModel: Model<Package>,
    @InjectModel(Topic.name) private topicModel: Model<Topic>,
    private pdfReportService: PdfReportService,
    private excelReportService: ExcelReportService,
    private userService: UsersService,
    private s3Service: S3Service,
  ) {}

  async generateReport(reportId: string): Promise<void> {
    const report = await this.reportModel.findById(reportId);

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    try {
      // Update report status to processing
      report.status = ReportStatus.PROCESSING;
      await report.save();

      // Get data based on report type
      const data = await this.getReportData(report);

      // Generate report based on format
      let fileBuffer: Buffer;

      if (report.format === ReportFormat.PDF) {
        fileBuffer = await this.pdfReportService.generateReport(data, report);
      } else {
        fileBuffer = await this.excelReportService.generateReport(data, report);
      }

      // Generate file name
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
      const fileExtension = report.format === ReportFormat.PDF ? 'pdf' : 'xlsx';
      const fileName = `report_${report.reportType}_${timestamp}.${fileExtension}`;

      // Upload file to S3
      const fileUrl = await this.s3Service.uploadBuffer(
        fileBuffer,
        fileName,
        report.format === ReportFormat.PDF
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );

      // Update report status to completed
      report.status = ReportStatus.COMPLETED;
      report.fileUrl = fileUrl;
      report.generatedAt = new Date();
      await report.save();
    } catch (error) {
      console.error(`Error generating report: ${error.message}`);

      // Update report status to failed
      report.status = ReportStatus.FAILED;
      report.errorMessage = error.message;
      await report.save();
    }
  }

  private async getReportData(report: Report): Promise<any> {
    switch (report.reportType) {
      case ReportType.STUDENT:
        return this.getStudentReportData(report);
      case ReportType.SUBJECT:
        return this.getSubjectReportData(report);
      case ReportType.COURSE:
        return this.getCourseReportData(report);
      case ReportType.PACKAGE:
        return this.getPackageReportData(report);
      case ReportType.TEST:
        return this.getTestReportData(report);
      case ReportType.INSTITUTE:
        return this.getInstituteReportData(report);
      case ReportType.OVERALL:
        return this.getOverallReportData(report);
      default:
        throw new Error(
          `Unsupported report type: ${String(report.reportType)}`,
        );
    }
  }

  private async getStudentReportData(report: Report): Promise<any> {
    const student = await this.userModel
      .findById(report.student)
      .populate('institute', 'full_name');

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${String(report.student)} not found`,
      );
    }

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate) {
        dateFilter.$gte = new Date(report.dateRange.startDate);
      }
      if (report.dateRange.endDate) {
        dateFilter.$lte = new Date(report.dateRange.endDate);
      }
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Fetch non-bulk results
    const query: any = {
      student: report.student,
      isBulkUploaded: { $ne: true },
    };
    if (hasDateFilter) query.startedAt = dateFilter;
    const regularResults = await this.resultModel
      .find(query)
      .populate('test', 'title')
      .populate('subject', 'title')
      .exec();

    // Fetch bulk-uploaded results separately (CSV / update-report-card)
    const bulkQuery: any = {
      student: report.student,
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;
    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    // Combine: regular results plus bulk results (deduplicated per subject — keep latest)
    const seenSubjects = new Set<string>();
    const combinedBulk: any[] = [];
    for (const br of bulkResults) {
      const subjId =
        (br.subject as any)?._id?.toString?.() ??
        (br.subject as any)?.toString?.() ??
        '';
      if (!seenSubjects.has(subjId)) {
        seenSubjects.add(subjId);
        combinedBulk.push(br);
      }
    }
    const allResults = [...regularResults, ...combinedBulk];

    // Calculate performance metrics
    const totalTests = allResults.length;
    const completedTests = allResults.filter(
      (r) => r.status === 'finished',
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    allResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

    // Group results by subject for subject-wise performance
    const subjectMap = new Map();

    allResults.forEach((result) => {
      const subj = result.subject;
      const subjectId =
        subj?._id?.toString?.() ?? subj?.toString?.() ?? 'unknown';
      const subjectName = subj?.title || 'Unknown';

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: subjectName,
          totalTests: 0,
          completedTests: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.totalTests++;

      if (result.status === 'finished') {
        subjectData.completedTests++;
      }

      if (result.marksSummary) {
        subjectData.totalScore += result.marksSummary.obtainedMarks;
        subjectData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const subjectPerformance: any[] = [];
    subjectMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? (data.totalScore / data.totalPossibleScore) * 100
          : 0;
      subjectPerformance.push({
        ...data,
        averageScore: avgScore.toFixed(2),
      });
    });

    const studentInstitute: any = student.institute;

    // Build test results — all individual entries
    const testResults = allResults.map((result: any) => {
      const isBulk = result.isBulkUploaded === true;
      const subjTitle = result.subject?.title || 'Unknown';
      return {
        testName: isBulk ? subjTitle : result.test?.title || 'Unknown',
        subject: subjTitle,
        status: result.status,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        score: result.marksSummary ? result.marksSummary.obtainedMarks : 'N/A',
        totalMarks: result.marksSummary
          ? result.marksSummary.totalMarks
          : 'N/A',
        percentage: result.marksSummary
          ? (
              (result.marksSummary.obtainedMarks /
                result.marksSummary.totalMarks) *
              100
            ).toFixed(2)
          : 'N/A',
        testType: result.testType || 'mock',
        isBulkUploaded: isBulk,
        reportCardLink: result.reportCardLink || null,
        timeTaken: result.timeTaken || null,
      };
    });

    return {
      studentInfo: {
        id: student._id,
        name: student.full_name,
        email: student.email,
        phone: student.phone,
        institute: studentInstitute?.full_name || 'N/A',
      },
      summary: {
        totalTests,
        completedTests,
        averageScore: averageScore.toFixed(2),
        totalScore,
        totalPossibleScore,
        rank:
          allResults.find((r: any) => r.marksSummary?.rank != null)
            ?.marksSummary?.rank ?? null,
      },
      subjectPerformance,
      testResults,
    };
  }

  private async getSubjectReportData(report: Report): Promise<any> {
    const subject = await this.subjectModel.findById(report.subject);

    if (!subject) {
      throw new NotFoundException(
        `Subject with ID ${String(report.subject)} not found`,
      );
    }

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Fetch regular results for this subject
    const query: any = {
      subject: report.subject,
      isBulkUploaded: { $ne: true },
    };
    if (report.institute) query.institute = report.institute;
    if (hasDateFilter) query.startedAt = dateFilter;

    const regularResults = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate('test', 'title testType')
      .populate('institute', 'full_name')
      .exec();

    // Fetch bulk-uploaded results for this subject
    const bulkQuery: any = {
      subject: report.subject,
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    // Combine all results
    const allResults = [...regularResults, ...bulkResults];

    // Calculate overall performance
    const totalTests = allResults.length;
    let totalScore = 0;
    let totalPossibleScore = 0;
    let highestScore = 0;
    let lowestScore = Infinity;

    allResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
        const pct =
          result.marksSummary.totalMarks > 0
            ? (result.marksSummary.obtainedMarks /
                result.marksSummary.totalMarks) *
              100
            : 0;
        if (pct > highestScore) highestScore = pct;
        if (pct < lowestScore) lowestScore = pct;
      }
    });

    const averageScore =
      totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;
    const uniqueStudents = new Set(
      allResults.map(
        (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
      ),
    );

    // Group results by test for test performance
    const testMap = new Map<string, any>();
    allResults.forEach((result: any) => {
      const isBulk = result.isBulkUploaded === true;
      const testKey = isBulk
        ? `bulk_${result.subject?._id?.toString?.() ?? 'unknown'}`
        : (result.test?._id?.toString?.() ?? 'unknown');
      const testName = isBulk
        ? result.subject?.title || 'Bulk Entry'
        : result.test?.title || 'Unknown';
      const testType = result.testType || 'mock';

      if (!testMap.has(testKey)) {
        testMap.set(testKey, {
          testName,
          testType,
          date: result.startedAt || result.finishedAt,
          attempts: 0,
          completed: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const td = testMap.get(testKey)!;
      td.attempts++;
      if (result.status === 'finished') td.completed++;
      if (result.marksSummary) {
        td.totalScore += result.marksSummary.obtainedMarks;
        td.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const testPerformance: any[] = [];
    testMap.forEach((td) => {
      const avgPct =
        td.totalPossibleScore > 0
          ? (td.totalScore / td.totalPossibleScore) * 100
          : 0;
      testPerformance.push({
        testName: td.testName,
        testType: td.testType,
        date: td.date
          ? new Date(td.date).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
            })
          : '-',
        avgScore: avgPct.toFixed(1),
        avgPercentage: avgPct.toFixed(1),
        studentsAttempted: td.attempts,
      });
    });

    // Compute test type distributions for this subject
    const testTypeDistributions = await this.computeTestTypeDistributions(
      [report.subject.toString()],
      report.dateRange,
      report.institute?.toString(),
    );

    return {
      subjectInfo: {
        name: subject.title,
        code: subject.code || '',
      },
      summary: {
        totalTests,
        totalStudents: uniqueStudents.size,
        avgScore: averageScore.toFixed(1),
        avgPercentage: averageScore.toFixed(1),
        highestScore: lowestScore === Infinity ? '-' : highestScore.toFixed(1),
        lowestScore: lowestScore === Infinity ? '-' : lowestScore.toFixed(1),
      },
      testPerformance,
      testTypeDistributions,
      leaderboard: this.computeLeaderboard(bulkResults),
    };
  }

  private computeLeaderboard(bulkResults: any[]): any {
    const testTypes = ['mock', 'practice', 'test', 'screening'];
    const studentRankMap = new Map<string, Map<string, number>>();

    for (const br of bulkResults) {
      const studentName = br.student?.full_name || 'Unknown';
      const testType = br.testType || 'mock';
      const rank = br.marksSummary?.rank;
      if (rank == null) continue;

      if (!studentRankMap.has(studentName)) {
        studentRankMap.set(studentName, new Map());
      }
      const ranks = studentRankMap.get(studentName)!;
      if (!ranks.has(testType) || rank < ranks.get(testType)!) {
        ranks.set(testType, rank);
      }
    }

    const entries = Array.from(studentRankMap.entries())
      .map(([studentName, rankMap]) => {
        const vals = Array.from(rankMap.values());
        const avgRank = vals.reduce((a, b) => a + b, 0) / vals.length;
        const testTypeRanks: Record<string, any> = {};
        for (const tt of testTypes) {
          testTypeRanks[tt] = rankMap.has(tt) ? rankMap.get(tt) : '-';
        }
        return { studentName, avgRank, testTypeRanks };
      })
      .sort((a, b) => a.avgRank - b.avgRank)
      .slice(0, 3);

    return {
      testTypes,
      entries,
      analytics: {
        totalStudents: new Set(
          bulkResults.map(
            (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
          ),
        ).size,
      },
    };
  }

  private async computeTestTypeDistributions(
    subjectIds: string[],
    dateRange?: { startDate?: string; endDate?: string },
    instituteId?: string,
  ): Promise<any[]> {
    const query: any = {
      subject: { $in: subjectIds },
      status: ResultStatus.FINISHED,
      marksSummary: { $exists: true },
    };
    if (instituteId) query.institute = instituteId;
    if (dateRange) {
      query.startedAt = {};
      if (dateRange.startDate)
        query.startedAt.$gte = new Date(dateRange.startDate);
      if (dateRange.endDate) query.startedAt.$lte = new Date(dateRange.endDate);
    }

    const results = await this.resultModel
      .find(query)
      .populate('subject', 'title')
      .lean()
      .exec();

    // Group by (studentId, subjectId, testType) → compute avg percentage
    const groupMap = new Map<string, { total: number; count: number }>();
    for (const r of results) {
      const subjId =
        (r.subject as any)?._id?.toString?.() ??
        r.subject?.toString?.() ??
        'unknown';
      const key = `${String(r.student)}_${subjId}_${r.testType || 'mock'}`;
      if (!groupMap.has(key)) groupMap.set(key, { total: 0, count: 0 });
      const g = groupMap.get(key)!;
      if ((r.marksSummary as any)?.totalMarks > 0) {
        const pct =
          ((r.marksSummary as any).obtainedMarks /
            (r.marksSummary as any).totalMarks) *
          100;
        g.total += pct;
        g.count++;
      }
    }

    // Bucket students per (subjectId, testType)
    const subjectBuckets = new Map<
      string,
      Map<
        string,
        {
          range0to40: Set<string>;
          range41to60: Set<string>;
          range61to80: Set<string>;
          range81to100: Set<string>;
        }
      >
    >();

    for (const [key, val] of groupMap) {
      const [studentId, subjId, testType] = key.split('_');
      if (val.count === 0) continue;
      const avgPct = val.total / val.count;

      if (!subjectBuckets.has(subjId)) subjectBuckets.set(subjId, new Map());
      const ttMap = subjectBuckets.get(subjId)!;
      if (!ttMap.has(testType)) {
        ttMap.set(testType, {
          range0to40: new Set(),
          range41to60: new Set(),
          range61to80: new Set(),
          range81to100: new Set(),
        });
      }
      const bucket = ttMap.get(testType)!;
      if (avgPct < 40) bucket.range0to40.add(studentId);
      else if (avgPct < 60) bucket.range41to60.add(studentId);
      else if (avgPct < 80) bucket.range61to80.add(studentId);
      else bucket.range81to100.add(studentId);
    }

    // Build output: per subject
    const distributions: any[] = [];
    const subjectNames = new Map<string, string>();
    for (const r of results) {
      const subjId =
        (r.subject as any)?._id?.toString?.() ??
        r.subject?.toString?.() ??
        'unknown';
      const subjName = (r.subject as any)?.title || 'Unknown';
      if (!subjectNames.has(subjId)) subjectNames.set(subjId, subjName);
    }

    for (const [subjId, ttMap] of subjectBuckets) {
      const dists: any[] = [];
      const testTypeOrder = ['mock', 'practice', 'test', 'screening'];
      for (const tt of testTypeOrder) {
        const bucket = ttMap.get(tt);
        if (bucket) {
          dists.push({
            testType: tt,
            range0to40: bucket.range0to40.size,
            range41to60: bucket.range41to60.size,
            range61to80: bucket.range61to80.size,
            range81to100: bucket.range81to100.size,
          });
        }
      }
      if (dists.length) {
        distributions.push({
          subjectName: subjectNames.get(subjId) || 'Unknown',
          distributions: dists,
        });
      }
    }

    return distributions;
  }

  private async getCourseReportData(report: Report): Promise<CourseReportData> {
    const course = await this.courseModel.findById(report.course);

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${String(report.course)} not found`,
      );
    }

    const user: any = await this.userModel
      .findById(report.institute)
      .populate('packages')
      .exec();

    let tests: any[] = [];

    let packageId: any = null;
    const reportCourseId = report.course.toString();
    if (user) {
      for (let x = 0; x < user.packages.length; x++) {
        const courseId = user.packages[x].course.toString();
        if (courseId == reportCourseId) {
          packageId = user.toObject().packages[x]._id.toString();
          break;
        }
      }

      const topics = await this.topicModel
        .find({ package: packageId, isParent: true })
        .populate({
          path: 'tests',
          model: 'Test',
          populate: { path: 'subject', model: 'Subject' },
        })
        .exec();

      tests = topics.map((topic) => topic.tests).flat();
    } else {
      throw new NotFoundException(`User not found`);
    }

    if (!tests.length) {
      console.log(
        'No tests found for the given IDs. Verify test IDs in the database.',
      );
    }

    // Get unique subject IDs from tests
    const subjectIds = [
      ...new Set(tests.map((test: any) => test.subject?._id.toString())),
    ];

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Fetch regular results for tests in this course
    const query: any = {
      test: { $in: tests.map((test) => test._id.toString()) },
      isBulkUploaded: { $ne: true },
    };
    if (report.institute) query.institute = report.institute;
    if (hasDateFilter) query.startedAt = dateFilter;

    const regularResults = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate('test', 'title testType')
      .populate('subject', 'title')
      .exec();

    // Fetch bulk-uploaded results for subjects in this course
    const bulkQuery: any = {
      subject: { $in: subjectIds },
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const allResults = [...regularResults, ...bulkResults];

    // Calculate overall performance metrics
    const totalTests = tests.length;
    const totalAttempted = allResults.length;
    const totalCompleted = allResults.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    allResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
        : '0';

    const uniqueStudents = new Set(
      allResults.map(
        (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
      ),
    );

    // Group performance by subject
    const subjectMap = new Map();
    tests.forEach((test: any) => {
      const subjectId = test.subject?._id.toString();
      if (!subjectId) return;

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          id: subjectId,
          name: test.subject?.title || 'Unknown',
          totalTests: 0,
          completedTests: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.totalTests++;
    });

    allResults.forEach((result: any) => {
      const subjectId = result.subject?._id.toString();
      if (!subjectId || !subjectMap.has(subjectId)) return;

      const subjectData = subjectMap.get(subjectId);
      if (result.status === ResultStatus.FINISHED) {
        subjectData.completedTests++;
      }

      if (result.marksSummary) {
        subjectData.totalScore += result.marksSummary.obtainedMarks;
        subjectData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const subjectPerformance = Array.from(subjectMap.values()).map(
      (subject) => ({
        subjectName: subject.name,
        code: '',
        totalTests: subject.totalTests,
        avgScore:
          subject.totalPossibleScore > 0
            ? (subject.totalScore / subject.totalPossibleScore).toFixed(1)
            : '0',
        avgPercentage:
          subject.totalPossibleScore > 0
            ? ((subject.totalScore / subject.totalPossibleScore) * 100).toFixed(
                1,
              )
            : '0',
      }),
    );

    // Compute test type distributions for subjects in this course
    const testTypeDistributions = await this.computeTestTypeDistributions(
      subjectIds,
      report.dateRange,
      report.institute?.toString(),
    );

    // Compute leaderboard from bulk results for subjects in this course
    const leaderboard = this.computeLeaderboard(bulkResults);

    return {
      courseInfo: {
        id: course._id.toString(),
        name: course.title,
        code: course.code,
      },
      summary: {
        totalTests,
        totalStudents: uniqueStudents.size,
        totalAttempted,
        totalCompleted,
        avgScore:
          totalPossibleScore > 0
            ? (totalScore / totalPossibleScore).toFixed(1)
            : '0',
        avgPercentage,
      },
      subjectPerformance,
      testTypeDistributions,
      leaderboard,
    };
  }

  private async getPackageReportData(report: Report): Promise<any> {
    const pkg = await this.packageModel.findById(report.package);

    if (!pkg) {
      throw new NotFoundException(
        `Package with ID ${String(report.package)} not found`,
      );
    }

    // Get courses associated with this package
    const courses = await this.courseModel
      .find({
        packages: { $in: [report.package] },
      })
      .lean();

    const courseIds = courses.map((course) => course._id);

    // Get tests associated with the courses in this package
    const tests = await this.testModel
      .find({
        course: { $in: courseIds },
      })
      .populate('subject')
      .populate('course')
      .lean();

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Get unique subject IDs from tests
    const subjectIds = [
      ...new Set(
        tests.map(
          (test: any) =>
            test.subject?._id?.toString?.() ?? test.subject?.toString?.(),
        ),
      ),
    ].filter(Boolean);

    // Fetch regular results for tests in this package
    const query: any = {
      test: { $in: tests.map((test) => test._id) },
      isBulkUploaded: { $ne: true },
    };
    if (report.institute) query.institute = report.institute;
    if (hasDateFilter) query.startedAt = dateFilter;

    const regularResults = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate('test', 'title')
      .populate('subject', 'title')
      .exec();

    // Fetch bulk-uploaded results for subjects in this package
    const bulkQuery: any = {
      subject: { $in: subjectIds },
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const allResults = [...regularResults, ...bulkResults];

    // Calculate overall metrics
    const totalTestCount = tests.length;
    const totalAttempted = allResults.length;
    const totalCompleted = allResults.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    allResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
        : '0';

    const uniqueStudents = new Set(
      allResults.map(
        (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
      ),
    );

    // Course-wise performance analysis
    const courseMap = new Map();

    allResults.forEach((result: any) => {
      const testId = result.test?._id?.toString?.();
      const test: any = testId
        ? tests.find((t) => t._id.toString() === testId)
        : null;
      if (!test || !test.course) return;

      const courseId = test.course._id.toString();
      const courseName = test.course.name || 'Unknown';

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseName,
          testsAttempted: 0,
          testsCompleted: 0,
          totalScore: 0,
          totalPossibleScore: 0,
          averageScore: '0',
          students: new Set(),
        });
      }

      const courseData = courseMap.get(courseId);
      courseData.testsAttempted++;
      courseData.students.add(
        result.student?._id?.toString?.() ?? result.student?.toString?.(),
      );

      if (result.status === ResultStatus.FINISHED) {
        courseData.testsCompleted++;
      }

      if (result.marksSummary) {
        courseData.totalScore += result.marksSummary.obtainedMarks;
        courseData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const coursePerformance: any[] = [];
    courseMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(1)
          : '0';
      const avgPct =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(1)
          : '0';

      coursePerformance.push({
        courseName: data.courseName,
        testsAttempted: data.testsAttempted,
        testsCompleted: data.testsCompleted,
        avgScore,
        avgPercentage: avgPct,
        studentCount: data.students.size,
      });
    });

    // Compute test type distributions for subjects in this package
    const testTypeDistributions = await this.computeTestTypeDistributions(
      subjectIds,
      report.dateRange,
      report.institute?.toString(),
    );

    // Compute leaderboard from bulk results for subjects in this package
    const leaderboard = this.computeLeaderboard(bulkResults);

    return {
      packageInfo: {
        id: pkg._id,
        name: `Package ${pkg.code}`,
        code: pkg.code,
        description: pkg.description,
      },
      summary: {
        totalCourses: courses.length,
        totalTests: totalTestCount,
        totalAttempted,
        totalCompleted,
        totalStudents: uniqueStudents.size,
        avgScore:
          totalPossibleScore > 0
            ? (totalScore / totalPossibleScore).toFixed(1)
            : '0',
        avgPercentage,
      },
      coursePerformance,
      testTypeDistributions,
      leaderboard,
    };
  }

  private async getTestReportData(report: Report): Promise<TestReportData> {
    // Test-type aggregation mode
    if ((report as any).testType) {
      return this.getTestTypeAggregatedReportData(report);
    }

    // Fallback to single-test mode
    const test = await this.testModel
      .findById(report.test)
      .populate('subject')
      .lean();

    if (!test) {
      throw new NotFoundException(
        `Test with ID ${String(report.test)} not found`,
      );
    }

    const subjectId = ((test.subject as any)?._id?.toString?.() ??
      test.subject?.toString?.()) as string;
    const totalMarks =
      (test.marksPerQuestion ?? 0) * ((test.questions as any[])?.length ?? 0);

    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const query: any = { test: report.test, isBulkUploaded: { $ne: true } };
    if (report.institute) query.institute = report.institute;
    if (hasDateFilter) query.startedAt = dateFilter;

    const regularResults = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate({
        path: 'questionResults',
        select: 'question answer isCorrect timeTaken',
      })
      .exec();

    const totalAttempts = regularResults.length;
    const completedAttempts = regularResults.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;
    let highestScore = 0;
    let lowestScore = Infinity;
    let totalTimeTaken = 0;
    let timeCount = 0;

    regularResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
        const pct =
          result.marksSummary.totalMarks > 0
            ? (result.marksSummary.obtainedMarks /
                result.marksSummary.totalMarks) *
              100
            : 0;
        if (pct > highestScore) highestScore = pct;
        if (pct < lowestScore) lowestScore = pct;
      }
      if (result.finishedAt && result.startedAt) {
        totalTimeTaken +=
          (result.finishedAt.getTime() - result.startedAt.getTime()) / 60000;
        timeCount++;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
        : '0';

    const avgTimeTaken =
      timeCount > 0 ? `${(totalTimeTaken / timeCount).toFixed(0)} min` : '-';

    const questionMap = new Map();

    regularResults.forEach((result) => {
      if (!result.questionResults) return;

      result.questionResults.forEach((qr: any) => {
        const questionId = qr.question.toString();

        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, {
            questionNo: questionMap.size + 1,
            attempts: 0,
            correct: 0,
            incorrect: 0,
            totalTime: 0,
          });
        }

        const questionData = questionMap.get(questionId);
        questionData.attempts++;

        if (qr.isCorrect) {
          questionData.correct++;
        } else {
          questionData.incorrect++;
        }

        if (qr.timeTaken) {
          questionData.totalTime += qr.timeTaken;
        }
      });
    });

    const questionAnalysis: any[] = [];
    questionMap.forEach((data) => {
      const avgTime = data.attempts > 0 ? data.totalTime / data.attempts : 0;

      questionAnalysis.push({
        questionNo: data.questionNo,
        totalAttempts: data.attempts,
        correct: data.correct,
        incorrect: data.incorrect,
        avgTime: avgTime.toFixed(0),
      });
    });

    const bulkQuery: any = {
      subject: subjectId,
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const testTypeDistributions = await this.computeTestTypeDistributions(
      [subjectId],
      report.dateRange,
      report.institute?.toString(),
    );

    const leaderboard = this.computeLeaderboard(bulkResults);

    const uniqueStudents = new Set(
      regularResults.map(
        (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
      ),
    );

    return {
      testInfo: {
        id: test._id.toString(),
        name: test.title,
        subject: (test.subject as any)?.title || 'Unknown',
        testType: test.testType,
        totalMarks,
        duration: test.testDuration,
        date: (test as any).createdAt
          ? new Date((test as any).createdAt).toLocaleDateString()
          : undefined,
      },
      summary: {
        totalStudents: uniqueStudents.size,
        totalAttempts,
        completedAttempts,
        avgScore:
          totalPossibleScore > 0
            ? (totalScore / totalPossibleScore).toFixed(1)
            : '0',
        avgPercentage,
        highestScore: lowestScore === Infinity ? '-' : highestScore.toFixed(1),
        lowestScore: lowestScore === Infinity ? '-' : lowestScore.toFixed(1),
        avgTimeTaken,
      },
      questionAnalysis,
      studentResults: [],
      testTypeDistributions,
      leaderboard,
    };
  }

  private async getTestTypeAggregatedReportData(
    report: Report,
  ): Promise<TestReportData> {
    const testType = (report as any).testType;

    let testTypeTests: any[] = [];
    if (report.course) {
      const course = await this.courseModel.findById(report.course);
      if (course) {
        const user: any = await this.userModel
          .findById(report.institute)
          .populate('packages')
          .exec();
        let packageId: any = null;
        const reportCourseId = report.course.toString();
        if (user) {
          for (let x = 0; x < user.packages.length; x++) {
            const courseId = user.packages[x].course.toString();
            if (courseId === reportCourseId) {
              packageId = user.toObject().packages[x]._id.toString();
              break;
            }
          }

          const topics = await this.topicModel
            .find({ package: packageId, isParent: true })
            .populate({
              path: 'tests',
              model: 'Test',
              match: { testType },
              populate: { path: 'subject', model: 'Subject' },
            })
            .exec();

          testTypeTests = topics
            .map((topic) => (topic.tests as any[]) || [])
            .flat()
            .filter(Boolean);
        }
      }
    }

    // Fall back to global search if course-based lookup found nothing
    if (!testTypeTests?.length) {
      testTypeTests = await this.testModel
        .find({ testType })
        .populate('subject')
        .lean();
    }

    if (!testTypeTests.length) {
      const label =
        (
          {
            mock: 'Mock Test',
            practice: 'Practice Test',
            test: 'Assessment Test',
            screening: 'Screening Test',
          } as Record<string, string>
        )[testType as string] || (testType as string);
      throw new NotFoundException(
        `No ${label} tests found in the system. Create a test of type "${testType}" first.`,
      );
    }

    const testIds = testTypeTests.map((t) => t._id);
    const subjectIds = [
      ...new Set(
        testTypeTests
          .map(
            (t: any) => t.subject?._id?.toString?.() ?? t.subject?.toString?.(),
          )
          .filter(Boolean),
      ),
    ];
    const subjectTitles = [
      ...new Set(testTypeTests.map((t: any) => t.subject?.title || 'Unknown')),
    ];
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    const regularQuery: any = {
      test: { $in: testIds },
      isBulkUploaded: { $ne: true },
    };
    if (report.institute) regularQuery.institute = report.institute;
    if (hasDateFilter) regularQuery.startedAt = dateFilter;

    const regularResults = await this.resultModel
      .find(regularQuery)
      .populate('student', 'full_name email')
      .populate('test', 'title testType')
      .populate('subject', 'title')
      .populate({
        path: 'questionResults',
        select: 'question answer isCorrect timeTaken',
      })
      .exec();

    const bulkQuery: any = {
      subject: { $in: subjectIds },
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const totalAttempts = regularResults.length;
    const completedAttempts = regularResults.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;
    let highestScore = 0;
    let lowestScore = Infinity;
    let totalTimeTaken = 0;
    let timeCount = 0;

    regularResults.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
        const pct =
          result.marksSummary.totalMarks > 0
            ? (result.marksSummary.obtainedMarks /
                result.marksSummary.totalMarks) *
              100
            : 0;
        if (pct > highestScore) highestScore = pct;
        if (pct < lowestScore) lowestScore = pct;
      }
      if (result.finishedAt && result.startedAt) {
        totalTimeTaken +=
          (result.finishedAt.getTime() - result.startedAt.getTime()) / 60000;
        timeCount++;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(1)
        : '0';

    const avgTimeTaken =
      timeCount > 0 ? `${(totalTimeTaken / timeCount).toFixed(0)} min` : '-';

    const questionMap = new Map();

    regularResults.forEach((result) => {
      if (!result.questionResults) return;

      result.questionResults.forEach((qr: any) => {
        const questionId = qr.question.toString();

        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, {
            questionNo: questionMap.size + 1,
            attempts: 0,
            correct: 0,
            incorrect: 0,
            totalTime: 0,
          });
        }

        const questionData = questionMap.get(questionId);
        questionData.attempts++;

        if (qr.isCorrect) {
          questionData.correct++;
        } else {
          questionData.incorrect++;
        }

        if (qr.timeTaken) {
          questionData.totalTime += qr.timeTaken;
        }
      });
    });

    const questionAnalysis: any[] = [];
    questionMap.forEach((data) => {
      const avgTime = data.attempts > 0 ? data.totalTime / data.attempts : 0;

      questionAnalysis.push({
        questionNo: data.questionNo,
        totalAttempts: data.attempts,
        correct: data.correct,
        incorrect: data.incorrect,
        avgTime: avgTime.toFixed(0),
      });
    });

    const testTypeDistributions = await this.computeTestTypeDistributions(
      subjectIds,
      report.dateRange,
      report.institute?.toString(),
    );

    const leaderboard = this.computeLeaderboard(bulkResults);

    const uniqueStudents = new Set(
      regularResults.map(
        (r: any) => r.student?._id?.toString?.() ?? r.student?.toString?.(),
      ),
    );

    const testTypeLabel =
      (
        {
          mock: 'Mock Test',
          practice: 'Practice Test',
          test: 'Assessment Test',
          screening: 'Screening Test',
        } as Record<string, string>
      )[testType as string] || (testType as string);

    return {
      testInfo: {
        id: testType,
        name: testTypeLabel,
        testType,
        testsCount: testTypeTests.length,
        subjectsCovered: subjectTitles,
      },
      summary: {
        totalStudents: uniqueStudents.size,
        totalAttempts,
        completedAttempts,
        avgScore:
          totalPossibleScore > 0
            ? (totalScore / totalPossibleScore).toFixed(1)
            : '0',
        avgPercentage,
        highestScore: lowestScore === Infinity ? '-' : highestScore.toFixed(1),
        lowestScore: lowestScore === Infinity ? '-' : lowestScore.toFixed(1),
        avgTimeTaken,
      },
      questionAnalysis,
      studentResults: [],
      testTypeDistributions,
      leaderboard,
    };
  }

  async getInstituteCourses(instituteId?: string): Promise<Course[]> {
    const user = await this.userModel
      .findById(instituteId)
      .populate({
        path: 'packages',
        model: 'Package',
        populate: [{ path: 'course', model: 'Course' }],
      })
      .exec();

    return user
      ? user.packages.flatMap((packageItem: any) => packageItem.course)
      : [];
  }

  private async getInstituteReportData(
    report: Report,
  ): Promise<InstituteReportData> {
    const institute = await this.userModel.findById(report.institute).lean();

    if (!institute) {
      throw new NotFoundException(
        `Institute with ID ${String(report.institute)} not found`,
      );
    }

    // Get students belonging to this institute
    const students = await this.userModel
      .find({
        institute: report.institute,
      })
      .lean();

    // Get courses offered by this institute
    let courses = await this.getInstituteCourses(report.institute.toString());

    // Get tests for all courses of this institute
    let courseIds = courses.map((course) => course._id);
    let tests = await this.testModel
      .find({
        course: { $in: courseIds },
      })
      .populate('subject')
      .lean();

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build query for test results
    const query: any = { institute: report.institute };
    if (hasDateFilter) query.startedAt = dateFilter;

    // Get all results for this institute
    const results = await this.resultModel
      .find(query)
      .populate('test', 'title course')
      .populate('subject', 'title')
      .populate('student', 'full_name')
      .exec();

    // If no courses found via packages, try to fetch courses from results' tests
    if (courses.length === 0 && results.length > 0) {
      const resultCourseIds = [
        ...new Set(
          results.map((r: any) => r.test?.course?.toString?.()).filter(Boolean),
        ),
      ];
      if (resultCourseIds.length > 0) {
        courses = (await this.courseModel
          .find({ _id: { $in: resultCourseIds } })
          .lean()) as any[];
        courseIds = courses.map((c) => c._id);
        tests = await this.testModel
          .find({ course: { $in: courseIds } })
          .populate('subject')
          .lean();
      }
    }

    // Calculate overall metrics
    const totalAttempts = results.length;
    let totalScore = 0;
    let totalPossibleScore = 0;
    let totalCompleted = 0;

    results.forEach((result) => {
      if (result.status === ResultStatus.FINISHED) totalCompleted++;
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

    // Collect subject IDs from results directly
    const subjectIds: string[] = [];
    const subjectTitleMap = new Map<string, string>();
    for (const r of results) {
      const subjId = (r.subject as any)?._id?.toString?.();
      const subjName = (r.subject as any)?.title || 'Unknown';
      if (subjId && !subjectIds.includes(subjId)) {
        subjectIds.push(subjId);
        subjectTitleMap.set(subjId, subjName);
      }
    }

    // Course performance analysis
    const courseMap = new Map();

    results.forEach((result: any) => {
      const testObj = result.test;
      if (!testObj) return;
      const courseId = testObj.course?.toString?.();
      if (!courseId) return;

      const course = courses.find((c: any) => c._id.toString() === courseId);
      const courseName = course?.title || 'Unknown';

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          courseId,
          courseName,
          testsAttempted: 0,
          testsCompleted: 0,
          totalScore: 0,
          totalPossibleScore: 0,
          students: new Set(),
        });
      }

      const courseData = courseMap.get(courseId);
      courseData.testsAttempted++;
      courseData.students.add(result.student?._id.toString());

      if (result.status === ResultStatus.FINISHED) {
        courseData.testsCompleted++;
      }

      if (result.marksSummary) {
        courseData.totalScore += result.marksSummary.obtainedMarks;
        courseData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const coursePerformance: any[] = [];
    courseMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      coursePerformance.push({
        courseId: data.courseId,
        courseName: data.courseName,
        testsAttempted: data.testsAttempted,
        testsCompleted: data.testsCompleted,
        totalScore: data.totalScore,
        totalPossibleScore: data.totalPossibleScore,
        averageScore: avgScore + '%',
        studentCount: data.students.size,
      });
    });

    // Subject performance analysis
    const subjectMap = new Map();

    results.forEach((result: any) => {
      const subjectId = result.subject?._id.toString();
      const subjectName = result.subject?.title || 'Unknown';

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: subjectName,
          totalTests: 0,
          completedTests: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.totalTests++;

      if (result.status === ResultStatus.FINISHED) {
        subjectData.completedTests++;
      }

      if (result.marksSummary) {
        subjectData.totalScore += result.marksSummary.obtainedMarks;
        subjectData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const subjectPerformance: any[] = [];
    subjectMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      subjectPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    // Test performance analysis
    const testMap = new Map();

    results.forEach((result: any) => {
      const testId = result.test?._id.toString();
      const testName = result.test?.title || 'Unknown';

      if (!testMap.has(testId)) {
        testMap.set(testId, {
          test: testName,
          attempts: 0,
          completed: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const testData = testMap.get(testId);
      testData.attempts++;

      if (result.status === ResultStatus.FINISHED) {
        testData.completed++;
      }

      if (result.marksSummary) {
        testData.totalScore += result.marksSummary.obtainedMarks;
        testData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const testPerformance: any[] = [];
    testMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      testPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    // Fetch bulk-uploaded results for leaderboard
    const bulkQuery: any = {
      subject: { $in: subjectIds },
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (report.institute) bulkQuery.institute = report.institute;
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const testTypeDistributions = await this.computeTestTypeDistributions(
      subjectIds,
      report.dateRange,
      report.institute?.toString(),
    );

    const leaderboard = this.computeLeaderboard(bulkResults);

    return {
      instituteInfo: {
        id: institute._id.toString(),
        name: institute.full_name,
        email: (institute as any).email,
        phone: (institute as any).phone,
      },
      summary: {
        totalStudents: students.length,
        totalCourses: courses.length,
        totalTests: tests.length,
        testAttempts: totalAttempts,
        totalCompleted,
        averageScore: avgPercentage,
        avgPercentage,
      },
      coursePerformance,
      subjectPerformance,
      testPerformance,
      testTypeDistributions,
      leaderboard,
    };
  }

  private async getOverallReportData(
    report: Report,
  ): Promise<OverallReportData> {
    // Get counts for various entities
    const studentRoleId = await this.userService.getStudentRoleId();
    const instituteRoleId = await this.userService.getInstituteRoleId();
    const totalInstitutes = await this.userModel.countDocuments({
      role: instituteRoleId,
    });
    const totalStudents = await this.userModel.countDocuments({
      role: studentRoleId,
    });
    const totalCourses = await this.courseModel.countDocuments({});
    const totalTests = await this.testModel.countDocuments({});

    // Build date filter
    const dateFilter: any = {};
    if (report.dateRange) {
      if (report.dateRange.startDate)
        dateFilter.$gte = new Date(report.dateRange.startDate);
      if (report.dateRange.endDate)
        dateFilter.$lte = new Date(report.dateRange.endDate);
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Build query for results
    const query: any = {};
    if (hasDateFilter) query.startedAt = dateFilter;

    // Get all results based on query
    const results = await this.resultModel
      .find(query)
      .populate('test', 'title')
      .populate('subject', 'title')
      .populate('institute', 'full_name')
      .exec();

    // Calculate overall metrics
    const totalAttempts = results.length;
    let totalScore = 0;
    let totalPossibleScore = 0;
    let totalCompleted = 0;

    results.forEach((result) => {
      if (result.status === ResultStatus.FINISHED) totalCompleted++;
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const avgPercentage =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

    // Collect subject IDs from results for distributions and bulk queries
    const subjectIds: string[] = [];
    for (const r of results) {
      const subjId = (r.subject as any)?._id?.toString?.();
      if (subjId && !subjectIds.includes(subjId)) {
        subjectIds.push(subjId);
      }
    }

    // Institute performance analysis
    const instituteMap = new Map();

    results.forEach((result: any) => {
      const instituteId = result.institute?._id.toString();
      const instituteName = result.institute?.full_name || 'Unknown';

      if (!instituteMap.has(instituteId)) {
        instituteMap.set(instituteId, {
          institute: instituteName,
          testsAttempted: 0,
          testsCompleted: 0,
          totalScore: 0,
          totalPossibleScore: 0,
          students: new Set(),
        });
      }

      const instituteData = instituteMap.get(instituteId);
      instituteData.testsAttempted++;
      instituteData.students.add(result.student?._id.toString());

      if (result.status === ResultStatus.FINISHED) {
        instituteData.testsCompleted++;
      }

      if (result.marksSummary) {
        instituteData.totalScore += result.marksSummary.obtainedMarks;
        instituteData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const institutePerformance: any[] = [];
    instituteMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      institutePerformance.push({
        institute: data.institute,
        testsAttempted: data.testsAttempted,
        testsCompleted: data.testsCompleted,
        studentCount: data.students.size,
        averageScore: avgScore + '%',
      });
    });

    // Subject performance analysis (same as in institute report)
    const subjectMap = new Map();

    results.forEach((result: any) => {
      const subjectId = result.subject?._id.toString();
      const subjectName = result.subject?.title || 'Unknown';

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: subjectName,
          totalTests: 0,
          completedTests: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.totalTests++;

      if (result.status === ResultStatus.FINISHED) {
        subjectData.completedTests++;
      }

      if (result.marksSummary) {
        subjectData.totalScore += result.marksSummary.obtainedMarks;
        subjectData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const subjectPerformance: any[] = [];
    subjectMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      subjectPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    // Test performance analysis (same as in institute report)
    const testMap = new Map();

    results.forEach((result: any) => {
      const testId = result.test?._id.toString();
      const testName = result.test?.title || 'Unknown';

      if (!testMap.has(testId)) {
        testMap.set(testId, {
          test: testName,
          attempts: 0,
          completed: 0,
          totalScore: 0,
          totalPossibleScore: 0,
        });
      }

      const testData = testMap.get(testId);
      testData.attempts++;

      if (result.status === ResultStatus.FINISHED) {
        testData.completed++;
      }

      if (result.marksSummary) {
        testData.totalScore += result.marksSummary.obtainedMarks;
        testData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const testPerformance: any[] = [];
    testMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      testPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    // Fetch bulk-uploaded results for leaderboard
    const bulkQuery: any = {
      subject: { $in: subjectIds },
      isBulkUploaded: true,
      status: ResultStatus.FINISHED,
    };
    if (hasDateFilter) bulkQuery.startedAt = dateFilter;

    const bulkResults = await this.resultModel
      .find(bulkQuery)
      .populate('student', 'full_name email')
      .populate('subject', 'title')
      .sort({ _id: -1 })
      .exec();

    const testTypeDistributions = await this.computeTestTypeDistributions(
      subjectIds,
      report.dateRange,
    );

    const leaderboard = this.computeLeaderboard(bulkResults);

    return {
      summary: {
        totalInstitutes,
        totalStudents,
        totalCourses,
        totalTests,
        testAttempts: totalAttempts,
        totalCompleted,
        averageScore: avgPercentage,
        avgPercentage,
      },
      institutePerformance,
      subjectPerformance,
      testPerformance,
      testTypeDistributions,
      leaderboard,
    };
  }
}
