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
        throw new Error(`Unsupported report type: ${report.reportType}`);
    }
  }

  private async getStudentReportData(report: Report): Promise<any> {
    const student = await this.userModel
      .findById(report.student)
      .populate('institute', 'full_name');

    if (!student) {
      throw new NotFoundException(
        `Student with ID ${report.student} not found`,
      );
    }

    // Get student's test results
    const query: any = { student: report.student };

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    const results = await this.resultModel
      .find(query)
      .populate('test', 'title')
      .populate('subject', 'title')
      .exec();

    // Calculate performance metrics
    const totalTests = results.length;
    const completedTests = results.filter(
      (r) => r.status === 'finished',
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

    // Group results by subject for subject-wise performance
    const subjectPerformance: any[] = [];
    const subjectMap = new Map();

    results.forEach((result) => {
      const subject: any = result.toObject().subject;
      const subjectId = subject?._id;
      const subjectName = subject?.title || 'Unknown';

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

    subjectMap.forEach((data) => {
      const averageScore =
        data.totalPossibleScore > 0
          ? (data.totalScore / data.totalPossibleScore) * 100
          : 0;

      subjectPerformance.push({
        ...data,
        averageScore: averageScore.toFixed(2),
      });
    });

    const studentInstitute: any = student.institute;

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
      },
      subjectPerformance,
      testResults: results.map((result: any) => ({
        testName: result.test?.title || 'Unknown',
        subject: result.subject?.title || 'Unknown',
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
      })),
    };
  }

  private async getSubjectReportData(report: Report): Promise<any> {
    const subject = await this.subjectModel.findById(report.subject);

    if (!subject) {
      throw new NotFoundException(
        `Subject with ID ${report.subject} not found`,
      );
    }

    // Get results for this subject
    const query: any = { subject: report.subject };

    if (report.institute) {
      query.institute = report.institute;
    }

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    const results = await this.resultModel
      .find(query)
      .populate('student', 'full_name')
      .populate('test', 'title')
      .populate('institute', 'full_name')
      .exec();

    // Calculate overall performance
    const totalTests = results.length;
    const completedTests = results.filter(
      (r) => r.status === 'finished',
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0 ? (totalScore / totalPossibleScore) * 100 : 0;

    // Group results by test
    const testPerformance: any[] = [];
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

      if (result.status === 'finished') {
        testData.completed++;
      }

      if (result.marksSummary) {
        testData.totalScore += result.marksSummary.obtainedMarks;
        testData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    testMap.forEach((data) => {
      const averageScore =
        data.totalPossibleScore > 0
          ? (data.totalScore / data.totalPossibleScore) * 100
          : 0;

      testPerformance.push({
        ...data,
        averageScore: averageScore.toFixed(2),
      });
    });

    return {
      subjectInfo: {
        id: subject._id,
        name: subject.title,
      },
      summary: {
        totalTests,
        completedTests,
        averageScore: averageScore.toFixed(2),
        totalScore,
        totalPossibleScore,
      },
      testPerformance,
      studentResults: results.map((result: any) => ({
        student: result.student?.title || 'Unknown',
        testName: result.test?.title || 'Unknown',
        institute: result.institute?.title || 'Unknown',
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
      })),
    };
  }

  private async getCourseReportData(report: Report): Promise<CourseReportData> {
    const course = await this.courseModel.findById(report.course);

    if (!course) {
      throw new NotFoundException(`Course with ID ${report.course} not found`);
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
          populate: [
            {
              path: 'subject',
              model: 'Subject',
            },
          ],
        })
        .exec();

      tests = topics.map((topic) => topic.tests).flat();
    } else {
      throw new NotFoundException(`User not found`);
    }

    // Get tests associated with this course
    // const tests = await this.testModel
    //   .find({
    //     _id: { $in: testIds },
    //   })
    //   .populate('subject')
    //   .lean();

    // Log if tests are empty
    if (!tests.length) {
      console.log(
        'No tests found for the given IDs. Verify test IDs in the database.',
      );
    }

    // Get unique subject IDs from tests
    const subjectIds = [
      ...new Set(tests.map((test: any) => test.subject?._id.toString())),
    ];

    // Query to filter results
    const query: any = {
      test: { $in: tests.map((test) => test._id.toString()) },
    };

    if (report.institute) {
      query.institute = report.institute;
    }

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    // Get results for all tests in this course
    const results = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate('test', 'title')
      .populate('subject', 'title')
      .exec();

    // Calculate overall performance metrics
    const totalTests = tests.length;
    const completedTests = results.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

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

    // Add results data to subject mapping
    results.forEach((result: any) => {
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
        ...subject,
        averageScore:
          subject.totalPossibleScore > 0
            ? ((subject.totalScore / subject.totalPossibleScore) * 100).toFixed(
                2,
              )
            : '0',
      }),
    );

    // Group student performance by student
    const studentMap = new Map();

    results.forEach((result: any) => {
      const studentId = result.student?._id.toString();
      const studentName = result.student?.title || 'Unknown';

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: studentName,
          testsAttempted: 0,
          testsCompleted: 0,
          totalScore: 0,
          totalPossibleScore: 0,
          averageScore: 0,
        });
      }

      const studentData = studentMap.get(studentId);
      studentData.testsAttempted++;

      if (result.status === ResultStatus.FINISHED) {
        studentData.testsCompleted++;
      }

      if (result.marksSummary) {
        studentData.totalScore += result.marksSummary.obtainedMarks;
        studentData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const studentPerformance: any[] = [];
    studentMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      studentPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    return {
      courseInfo: {
        id: course._id as string,
        name: course.title,
        code: course.code,
      },
      summary: {
        totalTests,
        completedTests,
        averageScore,
        totalScore,
        totalPossibleScore,
        subjectCount: subjectIds.length,
      },
      subjectPerformance,
      studentPerformance,
    };
  }

  private async getPackageReportData(report: Report): Promise<any> {
    const pkg = await this.packageModel.findById(report.package);

    if (!pkg) {
      throw new NotFoundException(
        `Package with ID ${report.package} not found`,
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

    // Build query to filter results
    const query: any = {
      test: { $in: tests.map((test) => test._id) },
    };

    if (report.institute) {
      query.institute = report.institute;
    }

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    // Get results for all tests in this package
    const results = await this.resultModel
      .find(query)
      .populate('student', 'full_name email')
      .populate('test', 'title')
      .populate('subject', 'title')
      .exec();

    // Calculate overall metrics
    const totalTests = results.length;
    const completedTests = results.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

    // Course-wise performance analysis
    const courseMap = new Map();

    results.forEach((result: any) => {
      const testId = result.test?._id.toString();
      const test: any = tests.find((t) => t._id.toString() === testId);
      if (!test || !test.course) return;

      const courseId = test.course._id.toString();
      const courseName = test.course.name || 'Unknown';

      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          course: courseName,
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
        course: data.course,
        testsAttempted: data.testsAttempted,
        testsCompleted: data.testsCompleted,
        totalScore: data.totalScore,
        totalPossibleScore: data.totalPossibleScore,
        averageScore: avgScore,
        studentCount: data.students.size,
      });
    });

    // Student-wise performance analysis
    const studentMap = new Map();

    results.forEach((result: any) => {
      const studentId = result.student?._id.toString();
      const studentName = result.student?.name || 'Unknown';

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          student: studentName,
          testsAttempted: 0,
          testsCompleted: 0,
          totalScore: 0,
          totalPossibleScore: 0,
          averageScore: '0',
        });
      }

      const studentData = studentMap.get(studentId);
      studentData.testsAttempted++;

      if (result.status === ResultStatus.FINISHED) {
        studentData.testsCompleted++;
      }

      if (result.marksSummary) {
        studentData.totalScore += result.marksSummary.obtainedMarks;
        studentData.totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const studentPerformance: any[] = [];
    studentMap.forEach((data) => {
      const avgScore =
        data.totalPossibleScore > 0
          ? ((data.totalScore / data.totalPossibleScore) * 100).toFixed(2)
          : '0';

      studentPerformance.push({
        ...data,
        averageScore: avgScore,
      });
    });

    return {
      packageInfo: {
        id: pkg._id,
        description: pkg.description,
      },
      summary: {
        totalCourses: courses.length,
        totalTests: tests.length,
        testsAttempted: totalTests,
        testsCompleted: completedTests,
        averageScore,
        totalScore,
        totalPossibleScore,
      },
      coursePerformance,
      studentPerformance,
    };
  }

  private async getTestReportData(report: Report): Promise<TestReportData> {
    const test = await this.testModel.findById(report.test).lean();

    if (!test) {
      throw new NotFoundException(`Test with ID ${report.test} not found`);
    }

    // Build query to filter results
    const query: any = { test: report.test };

    if (report.institute) {
      query.institute = report.institute;
    }

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    // Get results for this test
    const results = await this.resultModel
      .find(query)
      .populate('student', 'name email')
      .populate({
        path: 'questionResults',
        select: 'question answer isCorrect timeTaken',
      })
      .exec();

    // Calculate overall metrics
    const totalAttempts = results.length;
    const completedAttempts = results.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

    // Question-level analysis
    const questionMap = new Map();

    // Populate question map with all questions from test
    results.forEach((result) => {
      if (!result.questionResults) return;

      result.questionResults.forEach((qr: any) => {
        const questionId = qr.question.toString();

        if (!questionMap.has(questionId)) {
          questionMap.set(questionId, {
            questionId,
            attempts: 0,
            correct: 0,
            incorrect: 0,
            totalTime: 0,
            averageTime: 0,
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
      const correctPercentage =
        data.attempts > 0 ? (data.correct / data.attempts) * 100 : 0;

      questionAnalysis.push({
        questionId: data.questionId,
        attempts: data.attempts,
        correct: data.correct,
        incorrect: data.incorrect,
        correctPercentage: correctPercentage.toFixed(2) + '%',
        averageTime: avgTime.toFixed(2) + 's',
      });
    });

    // Student results
    const studentResults = results.map((result: any) => ({
      testName: result.test?.title || 'Unknown',
      subject: result.subject?.title || 'Unknown',
      student: {
        id: result.student?._id,
        name: result.student?.full_name || 'Unknown',
        email: result.student?.email || 'Unknown',
      },
      status: result.status,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      score: result.marksSummary ? result.marksSummary.obtainedMarks : 'N/A',
      totalMarks: result.marksSummary ? result.marksSummary.totalMarks : 'N/A',
      percentage: result.marksSummary
        ? (
            (result.marksSummary.obtainedMarks /
              result.marksSummary.totalMarks) *
            100
          ).toFixed(2) + '%'
        : 'N/A',
      correctAnswers: result.marksSummary
        ? result.marksSummary.correctAnswers
        : 'N/A',
      incorrectAnswers: result.marksSummary
        ? result.marksSummary.incorrectAnswers
        : 'N/A',
      averageTimePerQuestion: result.marksSummary
        ? result.marksSummary.averageTimePerQuestion.toFixed(2) + 's'
        : 'N/A',
    }));

    const testSubject: any = test.subject;

    return {
      testInfo: {
        id: test._id as string,
        name: test.title,
        subject: testSubject?.title,
      },
      summary: {
        totalTests: totalAttempts,
        completedTests: completedAttempts,
        averageScore,
        totalScore,
        totalPossibleScore,
      },
      questionAnalysis,
      studentResults,
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
        `Institute with ID ${report.institute} not found`,
      );
    }

    // Get students belonging to this institute
    const students = await this.userModel
      .find({
        institute: report.institute,
      })
      .lean();

    // Get courses offered by this institute
    const courses = await this.getInstituteCourses(report.institute.toString());

    // Get tests for all courses of this institute
    const courseIds = courses.map((course) => course._id);
    const tests = await this.testModel
      .find({
        course: { $in: courseIds },
      })
      .populate('subject')
      .lean();

    // Build query for test results
    const query: any = { institute: report.institute };

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    // Get all results for this institute
    const results = await this.resultModel
      .find(query)
      .populate('test', 'title')
      .populate('subject', 'title')
      .populate('student', 'full_name')
      .exec();

    // Calculate overall metrics
    const totalAttempts = results.length;
    const completedAttempts = results.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

    // Course performance analysis
    const courseMap = new Map();

    results.forEach((result: any) => {
      const testId = result.test?._id.toString();
      const test: any = tests.find((t) => t._id.toString() === testId);
      if (!test || !test.course) return;

      const courseId = test.course.toString();
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

    return {
      instituteInfo: {
        id: institute._id as string,
        name: institute.full_name,
      },
      summary: {
        totalStudents: students.length,
        totalCourses: courses.length,
        totalTests: tests.length,
        testAttempts: totalAttempts,
        averageScore,
      },
      coursePerformance,
      subjectPerformance,
      testPerformance,
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

    // Build query for results
    const query: any = {};

    if (report.dateRange) {
      query.startedAt = {
        $gte: report.dateRange.startDate,
        $lte: report.dateRange.endDate,
      };
    }

    // Get all results based on query
    const results = await this.resultModel
      .find(query)
      .populate('test', 'title')
      .populate('subject', 'title')
      .populate('institute', 'full_name')
      .exec();

    // Calculate overall metrics
    const totalAttempts = results.length;
    const completedAttempts = results.filter(
      (r) => r.status === ResultStatus.FINISHED,
    ).length;
    let totalScore = 0;
    let totalPossibleScore = 0;

    results.forEach((result) => {
      if (result.marksSummary) {
        totalScore += result.marksSummary.obtainedMarks;
        totalPossibleScore += result.marksSummary.totalMarks;
      }
    });

    const averageScore =
      totalPossibleScore > 0
        ? ((totalScore / totalPossibleScore) * 100).toFixed(2)
        : '0';

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

    return {
      summary: {
        totalInstitutes,
        totalStudents,
        totalCourses,
        totalTests,
        testAttempts: totalAttempts,
        averageScore,
      },
      institutePerformance,
      subjectPerformance,
      testPerformance,
    };
  }
}
