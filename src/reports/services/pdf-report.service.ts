import { Injectable } from '@nestjs/common';
import * as pdfMake from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Report, ReportType } from '../schemas/report.schema';
import { PdfConfigService, PDF_MARGINS, PDF_COLORS, FONT_SIZES } from './pdf-config.service';
import { PdfHeaderFooterService } from './pdf-header-footer.service';
import { PdfTableService } from './pdf-table.service';

@Injectable()
export class PdfReportService {
  constructor(
    private config: PdfConfigService,
    private headerFooter: PdfHeaderFooterService,
    private tableService: PdfTableService,
  ) {}

  async generateReport(data: any, report: Report): Promise<Buffer> {
    const docDef = this.buildDocDefinition(data, report);
    const pdf = pdfMake.createPdf(docDef);
    return pdf.getBuffer();
  }

  private buildDocDefinition(data: any, report: Report): TDocumentDefinitions {
    const content: Content[] = [];

    switch (report.reportType) {
      case ReportType.STUDENT:
        this.buildStudentReport(data, content);
        break;
      case ReportType.SUBJECT:
        this.buildSubjectReport(data, content);
        break;
      case ReportType.COURSE:
        this.buildCourseReport(data, content);
        break;
      case ReportType.PACKAGE:
        this.buildPackageReport(data, content);
        break;
      case ReportType.TEST:
        this.buildTestReport(data, content);
        break;
      case ReportType.INSTITUTE:
        this.buildInstituteReport(data, content);
        break;
      case ReportType.OVERALL:
        this.buildOverallReport(data, content);
        break;
    }

    return {
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
        color: '#213126',
      },
      pageMargins: [PDF_MARGINS.left, 90, PDF_MARGINS.right, 60],
      header: this.headerFooter.buildHeader(report.name, report.dateRange as { startDate?: string; endDate?: string } | undefined),
      footer: this.headerFooter.buildFooter(),
      styles: this.config.getStyles(),
    };
  }

  private buildStudentReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Student Information');
    content.push(this.buildInfoTable([
      { label: 'Name', value: data.studentInfo.name },
      { label: 'Email', value: data.studentInfo.email },
      { label: 'Phone', value: data.studentInfo.phone },
      { label: 'Institute', value: data.studentInfo.institute },
    ]));

    this.addSectionHeader(content, 'Performance Summary');
    const summary = data.summary || {};
    content.push(this.buildSummaryGrid([
      { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
      { label: 'Completed', value: String(summary.completedTests ?? 0) },
      { label: 'Total Score', value: String(summary.totalScore ?? 0) },
      { label: 'Possible', value: String(summary.totalPossibleScore ?? 0) },
      { label: 'Overall %', value: `${summary.averageScore ?? 0}%` },
    ]));

    if (data.subjectPerformance?.length) {
      this.addSectionHeader(content, 'Subject-wise Performance');
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Score', 'Possible', '%'],
          data.subjectPerformance.map((s: any) => [
            s.subject,
            s.totalTests,
            s.totalScore,
            s.totalPossibleScore,
            `${s.averageScore}%`,
          ]),
        ),
      );
    }

    if (data.testResults?.length) {
      this.addSectionHeader(content, 'Recent Test Results');
      content.push(
        this.tableService.buildTable(
          ['Test Name', 'Subject', 'Type', 'Score', '%'],
          data.testResults.map((r: any) => [
            r.testName,
            r.subject,
            r.testType,
            r.score,
            r.percentage,
          ]),
        ),
      );
    }
  }

  private buildInfoTable(items: { label: string; value: string }[]): Content {
    const rows = items.map((item) => [
      { text: `${item.label}:`, bold: true, color: PDF_COLORS.body, fontSize: FONT_SIZES.body },
      { text: item.value || '-', color: PDF_COLORS.black, fontSize: FONT_SIZES.body, margin: [0, 0, 0, 2] },
    ]);
    return {
      table: { widths: [80, '*'], body: rows },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 8],
    } as any;
  }

  private buildSummaryGrid(items: { label: string; value: string }[]): Content {
    const rows: any[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      const left = items[i];
      const right = items[i + 1];
      rows.push([
        { text: `${left.label}: ${left.value}`, fontSize: FONT_SIZES.body, margin: [0, 1, 0, 1] },
        right
          ? { text: `${right.label}: ${right.value}`, fontSize: FONT_SIZES.body, margin: [0, 1, 0, 1] }
          : { text: '', fontSize: FONT_SIZES.body },
      ]);
    }
    return {
      table: { widths: ['*', '*'], body: rows },
      layout: 'noBorders',
      margin: [0, 0, 0, 8],
    } as any;
  }

  private buildSubjectReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Subject Information');
    content.push(
      this.headerFooter.buildInfoCard([
        { label: 'Subject', value: data.subjectInfo.name },
        { label: 'Code', value: data.subjectInfo.code },
        { label: 'Course', value: data.subjectInfo.course },
        { label: 'Package', value: data.subjectInfo.package },
      ]),
    );

    this.addSectionHeader(content, 'Performance Summary');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Total Tests', value: String(data.summary.totalTests ?? 0) },
        { label: 'Students Attempted', value: String(data.summary.totalStudents ?? 0) },
        { label: 'Avg Score', value: `${data.summary.averageScore ?? 0}%` },
        { label: 'Highest', value: String(data.summary.highestScore ?? '-') },
        { label: 'Lowest', value: String(data.summary.lowestScore ?? '-') },
      ]),
    );

    if (data.testPerformance?.length) {
      this.addSectionHeader(content, 'Test Performance');
      content.push(
        this.tableService.buildTable(
          ['Test Name', 'Type', 'Date', 'Avg %', 'Attempted'],
          data.testPerformance.map((t: any) => [
            t.test || t.testName,
            t.testType,
            t.date ? new Date(t.date).toLocaleDateString() : '-',
            `${t.averageScore ?? t.avgPercentage}%`,
            t.studentsAttempted ?? t.attempts,
          ]),
        ),
      );
    }

    if (data.studentResults?.length) {
      this.addSectionHeader(content, 'Student Results');
      content.push(
        this.tableService.buildTable(
          ['Student', 'Test', 'Type', 'Score', '%'],
          data.studentResults.map((r: any) => [
            r.studentName || r.student?.name,
            r.testName,
            r.testType,
            r.totalScore ?? r.score,
            r.percentage,
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private buildCourseReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Course Information');
    content.push(
      this.headerFooter.buildInfoCard([
        { label: 'Course', value: data.courseInfo.name },
        { label: 'Code', value: data.courseInfo.code },
      ]),
    );

    this.addSectionHeader(content, 'Performance Summary');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Total Tests', value: String(data.summary.totalTests ?? 0) },
        { label: 'Total Students', value: String(data.summary.totalStudents ?? 0) },
        { label: 'Attempted', value: String(data.summary.totalAttempted ?? 0) },
        { label: 'Completed', value: String(data.summary.totalCompleted ?? 0) },
        { label: 'Avg %', value: `${data.summary.averageScore ?? data.summary.avgPercentage}%` },
      ]),
    );

    if (data.subjectPerformance?.length) {
      this.addSectionHeader(content, 'Subject Performance');
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Avg Score', 'Avg %'],
          data.subjectPerformance.map((s: any) => [
            s.subjectName || s.subject,
            s.totalTests,
            s.avgScore,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
        ),
      );
    }

    if (data.studentPerformance?.length) {
      this.addSectionHeader(content, 'Student Performance');
      content.push(
        this.tableService.buildTable(
          ['Student', 'Tests', 'Avg Score', 'Avg %'],
          data.studentPerformance.map((s: any) => [
            s.studentName || s.student?.name,
            s.totalTests,
            s.avgScore,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private buildPackageReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Package Information');
    content.push(
      this.headerFooter.buildInfoCard([
        { label: 'Package', value: data.packageInfo.name },
        { label: 'Code', value: data.packageInfo.code },
        { label: 'Description', value: data.packageInfo.description },
      ]),
    );

    this.addSectionHeader(content, 'Performance Summary');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Total Courses', value: String(data.summary.totalCourses ?? 0) },
        { label: 'Total Tests', value: String(data.summary.totalTests ?? 0) },
        { label: 'Attempted', value: String(data.summary.testsAttempted ?? data.summary.totalAttempted ?? 0) },
        { label: 'Completed', value: String(data.summary.testsCompleted ?? data.summary.totalCompleted ?? 0) },
        { label: 'Avg %', value: `${data.summary.averageScore ?? 0}%` },
      ]),
    );

    if (data.coursePerformance?.length) {
      this.addSectionHeader(content, 'Course Performance');
      content.push(
        this.tableService.buildTable(
          ['Course', 'Attempted', 'Completed', 'Avg %', 'Students'],
          data.coursePerformance.map((c: any) => [
            c.courseName || c.course,
            c.testsAttempted ?? c.totalTests,
            c.testsCompleted ?? c.completedTests,
            `${c.averageScore ?? c.avgPercentage}%`,
            c.studentCount ?? '-',
          ]),
        ),
      );
    }

    if (data.studentPerformance?.length) {
      this.addSectionHeader(content, 'Student Performance');
      content.push(
        this.tableService.buildTable(
          ['Student', 'Tests', 'Avg Score', 'Avg %'],
          data.studentPerformance.map((s: any) => [
            s.studentName || s.student?.name,
            s.totalTests,
            s.avgScore,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private buildTestReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Test Information');
    content.push(
      this.headerFooter.buildInfoCard([
        { label: 'Test Name', value: data.testInfo.name },
        { label: 'Subject', value: data.testInfo.subject },
        { label: 'Type', value: data.testInfo.testType },
        { label: 'Total Marks', value: String(data.testInfo.totalMarks ?? '-') },
        { label: 'Duration', value: data.testInfo.duration ? `${data.testInfo.duration} min` : '-' },
        { label: 'Date', value: data.testInfo.date ? new Date(data.testInfo.date).toLocaleDateString() : '-' },
      ]),
    );

    this.addSectionHeader(content, 'Performance Summary');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Students', value: String(data.summary.totalStudents ?? data.summary.totalTests ?? 0) },
        { label: 'Avg Score', value: `${data.summary.averageScore ?? 0}%` },
        { label: 'Highest', value: String(data.summary.highestScore ?? '-') },
        { label: 'Lowest', value: String(data.summary.lowestScore ?? '-') },
        { label: 'Avg Time', value: data.summary.avgTimeTaken ?? '-' },
      ]),
    );

    if (data.questionAnalysis?.length) {
      this.addSectionHeader(content, 'Question Analysis');
      content.push(
        this.tableService.buildTable(
          ['Q#', 'Attempts', 'Correct', 'Wrong', 'Avg Time'],
          data.questionAnalysis.map((q: any, i: number) => [
            q.questionNo ?? (i + 1).toString(),
            q.attempts ?? q.totalAttempts,
            q.correct,
            q.incorrect,
            q.averageTime ?? q.avgTime,
          ]),
        ),
      );
    }

    if (data.studentResults?.length) {
      this.addSectionHeader(content, 'Student Results');
      content.push(
        this.tableService.buildTable(
          ['Rank', 'Student', 'Score', '%', 'Time'],
          data.studentResults.map((r: any, i: number) => [
            r.rank ?? (i + 1).toString(),
            r.studentName || r.student?.name,
            r.score,
            r.percentage,
            r.timeTaken ?? '-',
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private buildInstituteReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'Institute Information');
    content.push(
      this.headerFooter.buildInfoCard([
        { label: 'Institute', value: data.instituteInfo.name },
        { label: 'Email', value: data.instituteInfo.email },
        { label: 'Phone', value: data.instituteInfo.phone },
        { label: 'Total Students', value: String(data.summary.totalStudents ?? 0) },
      ]),
    );

    this.addSectionHeader(content, 'Performance Summary');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Courses', value: String(data.summary.totalCourses ?? 0) },
        { label: 'Tests', value: String(data.summary.totalTests ?? 0) },
        { label: 'Attempted', value: String(data.summary.testAttempts ?? data.summary.totalAttempted ?? 0) },
        { label: 'Completed', value: String(data.summary.totalCompleted ?? 0) },
        { label: 'Avg %', value: `${data.summary.averageScore ?? 0}%` },
      ]),
    );

    if (data.coursePerformance?.length) {
      this.addSectionHeader(content, 'Course Performance');
      content.push(
        this.tableService.buildTable(
          ['Course', 'Attempted', 'Completed', 'Students', 'Avg %'],
          data.coursePerformance.map((c: any) => [
            c.courseName || c.course,
            c.testsAttempted ?? c.totalTests,
            c.testsCompleted ?? c.completedTests,
            c.studentCount ?? '-',
            `${c.averageScore ?? c.avgPercentage}%`,
          ]),
        ),
      );
    }

    if (data.subjectPerformance?.length) {
      this.addSectionHeader(content, 'Subject Performance');
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Avg %'],
          data.subjectPerformance.map((s: any) => [
            s.subjectName || s.subject,
            s.totalTests ?? s.testsAttempted ?? s.totalAttempted,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private buildOverallReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'System Overview');
    content.push(
      this.headerFooter.buildSummaryCard([
        { label: 'Total Institutes', value: String(data.summary.totalInstitutes ?? 0) },
        { label: 'Total Students', value: String(data.summary.totalStudents ?? 0) },
        { label: 'Total Courses', value: String(data.summary.totalCourses ?? 0) },
        { label: 'Total Tests', value: String(data.summary.totalTests ?? 0) },
        { label: 'Total Results', value: String(data.summary.testAttempts ?? data.summary.totalResults ?? 0) },
        { label: 'System Avg %', value: `${data.summary.averageScore ?? 0}%` },
      ]),
    );

    if (data.institutePerformance?.length) {
      this.addSectionHeader(content, 'Institute Performance');
      content.push(
        this.tableService.buildTable(
          ['Institute', 'Attempted', 'Completed', 'Students', 'Avg %'],
          data.institutePerformance.map((i: any) => [
            i.instituteName || i.institute,
            i.testsAttempted ?? i.totalTests,
            i.testsCompleted ?? i.completedTests,
            i.studentCount ?? '-',
            `${i.averageScore ?? i.avgPercentage}%`,
          ]),
        ),
      );
    }

    if (data.subjectPerformance?.length) {
      this.addSectionHeader(content, 'Subject Performance');
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Avg %'],
          data.subjectPerformance.map((s: any) => [
            s.subjectName || s.subject,
            s.totalTests ?? s.testsAttempted,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
        ),
      );
    }

    this.addDistributionSections(content, data);
  }

  private addDistributionSections(content: Content[], data: any): void {
    if (!data.testTypeDistributions?.length) return;

    for (const dist of data.testTypeDistributions) {
      this.addSectionHeader(content, `Test Type Performance Distribution (${dist.subjectName})`);
      content.push(
        this.tableService.buildDistributionTable(
          dist.distributions.map((d: any) => ({
            testType: d.testType,
            ranges: [d.range0to40, d.range41to60, d.range61to80, d.range81to100],
          })),
        ),
      );
    }
  }

  private addSectionHeader(content: Content[], text: string): void {
    content.push({ text, style: 'sectionHeader' });
  }
}
