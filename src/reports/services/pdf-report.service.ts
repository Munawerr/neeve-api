import { Injectable } from '@nestjs/common';
import * as pdfMake from 'pdfmake';
import { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Report, ReportType } from '../schemas/report.schema';
import {
  PdfConfigService,
  PDF_MARGINS,
  PDF_COLORS,
  FONT_SIZES,
} from './pdf-config.service';
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
      header: this.headerFooter.buildHeader(
        report.name,
        report.dateRange as
          | { startDate?: string; endDate?: string }
          | undefined,
      ),
      footer: this.headerFooter.buildFooter(),
      styles: this.config.getStyles(),
    };
  }

  private buildStudentReport(data: any, content: Content[]): void {
    // 1. Student Information Card
    content.push(
      this.buildInfoCard('Student Information', [
        { label: 'Name', value: data.studentInfo.name },
        { label: 'Email', value: data.studentInfo.email },
        { label: 'Phone', value: data.studentInfo.phone },
        { label: 'Institute', value: data.studentInfo.institute },
      ]),
    );

    // 2. Performance Summary — metric grid
    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
        {
          label: 'Tests Completed',
          value: String(summary.completedTests ?? 0),
        },
        { label: 'Overall Percentage', value: `${summary.averageScore ?? 0}%` },
        { label: 'Total Score', value: String(summary.totalScore ?? 0) },
        { label: 'Max Score', value: String(summary.totalPossibleScore ?? 0) },
        {
          label: 'Overall Rank',
          value: summary.rank != null ? String(summary.rank) : 'N/A',
        },
      ]),
    );

    // 3. Subject-wise Performance
    if (data.subjectPerformance?.length) {
      content.push({ text: 'Subject Performance', style: 'sectionHeader' });
      content.push({
        text: 'How you performed in each subject across all tests',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Score', 'Max Score', '%'],
          data.subjectPerformance.map((s: any) => [
            s.subject,
            s.totalTests,
            s.totalScore,
            s.totalPossibleScore,
            `${s.averageScore}%`,
          ]),
          { widths: ['*', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    // 4. Recent Test Results
    if (data.testResults?.length) {
      content.push({ text: 'Recent Test Results', style: 'sectionHeader' });
      content.push({
        text: 'Your latest test attempts with scores and performance',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          ['Test Name', 'Subject', 'Type', 'Score', '%'],
          data.testResults.map((r: any) => [
            r.testName,
            r.subject,
            this.formatTestType(r.testType),
            r.score,
            r.percentage,
          ]),
          { widths: ['*', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }
  }

  private buildInfoCard(
    title: string,
    items: { label: string; value: string }[],
  ): Content {
    const headerRow: any = {
      text: title,
      style: 'subsectionHeader',
      color: PDF_COLORS.white,
      fillColor: PDF_COLORS.primary,
      margin: [8, 6, 8, 6],
      colSpan: 2,
    };
    const dataRows = items.map((item) => [
      {
        text: `${item.label}:`,
        bold: true,
        color: PDF_COLORS.body,
        fontSize: FONT_SIZES.body,
        noWrap: false,
        margin: [8, 4, 4, 4],
      },
      {
        text: item.value || '-',
        color: PDF_COLORS.black,
        fontSize: FONT_SIZES.body,
        noWrap: false,
        margin: [4, 4, 8, 4],
      },
    ]);
    return {
      table: {
        widths: [100, '*'],
        body: [[headerRow, {}], ...dataRows],
      },
      layout: {
        hLineWidth: (i: number, node: any) =>
          i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14],
    } as any;
  }

  private buildMetricGrid(items: { label: string; value: string }[]): Content {
    const cell = (label: string, value: string) => ({
      stack: [
        {
          text: label,
          fontSize: 8,
          color: PDF_COLORS.body,
          alignment: 'center',
          margin: [0, 4, 0, 0],
        },
        {
          text: value,
          fontSize: 16,
          bold: true,
          color: PDF_COLORS.primary,
          alignment: 'center',
          margin: [0, 2, 0, 6],
        },
      ],
      fillColor: PDF_COLORS.white,
      border: [true, true, true, true],
      borderColor: [
        PDF_COLORS.border,
        PDF_COLORS.border,
        PDF_COLORS.border,
        PDF_COLORS.border,
      ],
    });

    const rows: any[][] = [];
    for (let i = 0; i < items.length; i += 3) {
      const row = [];
      for (let j = 0; j < 3; j++) {
        const idx = i + j;
        if (idx < items.length) {
          const item = items[idx];
          row.push(cell(item.label, item.value));
        } else {
          row.push({ text: '', border: [false, false, false, false] });
        }
      }
      rows.push(row);
    }

    return {
      table: { widths: ['*', '*', '*'], body: rows },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => PDF_COLORS.border,
        vLineColor: () => PDF_COLORS.border,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 14],
    } as any;
  }

  private formatTestType(testType: string): string {
    const map: Record<string, string> = {
      mock: 'Mock Test',
      practice: 'Practice Test',
      test: 'Assessment Test',
      screening: 'Screening Test',
    };
    return map[testType] || testType;
  }

  private buildSubjectReport(data: any, content: Content[]): void {
    content.push(
      this.headerFooter.buildInfoCard('Subject Information', [
        { label: 'Subject', value: data.subjectInfo.name },
        { label: 'Code', value: data.subjectInfo.code || '-' },
      ]),
    );

    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
        {
          label: 'Students Attempted',
          value: String(summary.totalStudents ?? 0),
        },
        { label: 'Avg Percentage', value: `${summary.avgPercentage ?? 0}%` },
        {
          label: 'Highest Score',
          value:
            summary.highestScore != null ? `${summary.highestScore}%` : '-',
        },
        {
          label: 'Lowest Score',
          value: summary.lowestScore != null ? `${summary.lowestScore}%` : '-',
        },
        { label: 'Avg Score', value: String(summary.avgScore ?? 0) },
      ]),
    );

    if (data.testPerformance?.length) {
      content.push({
        text: 'Test Performance Overview',
        style: 'sectionHeader',
      });
      content.push({
        text: 'Average scores and number of students who attempted each test',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          ['Test Name', 'Type', 'Date', 'Avg %', 'Attempted'],
          data.testPerformance.map((t: any) => [
            t.testName || t.test,
            this.formatTestType(t.testType),
            t.date || '-',
            `${t.avgPercentage ?? t.avgScore}%`,
            t.studentsAttempted ?? t.attempts,
          ]),
          { widths: ['*', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    if (data.leaderboard?.entries?.length) {
      content.push({ text: 'Leaderboard', style: 'sectionHeader' });
      content.push({
        text: 'Top 3 students ranked by their average position across all test types',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    this.addDistributionSections(content, data);
  }

  private buildCourseReport(data: any, content: Content[]): void {
    content.push(
      this.headerFooter.buildInfoCard('Course Information', [
        { label: 'Course', value: data.courseInfo.name },
        { label: 'Code', value: data.courseInfo.code || '-' },
      ]),
    );

    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
        { label: 'Total Students', value: String(summary.totalStudents ?? 0) },
        {
          label: 'Tests Attempted',
          value: String(summary.totalAttempted ?? 0),
        },
        {
          label: 'Tests Completed',
          value: String(summary.totalCompleted ?? 0),
        },
        { label: 'Avg Score', value: String(summary.avgScore ?? 0) },
        { label: 'Avg Percentage', value: `${summary.avgPercentage ?? 0}%` },
      ]),
    );

    if (data.subjectPerformance?.length) {
      content.push({ text: 'Subject Performance', style: 'sectionHeader' });
      content.push({
        text: 'How students performed in each subject across all tests in this course',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Avg Score', 'Avg %'],
          data.subjectPerformance.map((s: any) => [
            s.subjectName || s.subject,
            s.totalTests,
            s.avgScore,
            `${s.avgPercentage}%`,
          ]),
          { widths: ['*', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    if (data.leaderboard?.entries?.length) {
      content.push({ text: 'Leaderboard', style: 'sectionHeader' });
      content.push({
        text: 'Top 3 students ranked by their average position across all test types',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    this.addDistributionSections(content, data);
  }

  private buildPackageReport(data: any, content: Content[]): void {
    content.push(
      this.headerFooter.buildInfoCard('Package Information', [
        { label: 'Package', value: data.packageInfo.name },
        { label: 'Code', value: data.packageInfo.code || '-' },
        { label: 'Description', value: data.packageInfo.description || '-' },
      ]),
    );

    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Courses', value: String(summary.totalCourses ?? 0) },
        { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
        {
          label: 'Tests Attempted',
          value: String(summary.totalAttempted ?? 0),
        },
        {
          label: 'Tests Completed',
          value: String(summary.totalCompleted ?? 0),
        },
        { label: 'Avg Score', value: String(summary.avgScore ?? 0) },
        { label: 'Avg Percentage', value: `${summary.avgPercentage ?? 0}%` },
      ]),
    );

    if (data.coursePerformance?.length) {
      content.push({ text: 'Course Performance', style: 'sectionHeader' });
      content.push({
        text: 'How students performed across the courses in this package',
        style: 'sectionCaption',
      });
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
          { widths: ['*', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    if (data.leaderboard?.entries?.length) {
      content.push({ text: 'Leaderboard', style: 'sectionHeader' });
      content.push({
        text: 'Top 3 students ranked by their average position across all test types',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    this.addDistributionSections(content, data);
  }

  private buildTestReport(data: any, content: Content[]): void {
    const isAggregated = data.testInfo.testsCount != null;

    if (isAggregated) {
      const subjectsText = data.testInfo.subjectsCovered?.length
        ? data.testInfo.subjectsCovered.join(', ')
        : '-';
      content.push(
        this.headerFooter.buildInfoCard('Test Information', [
          { label: 'Test Type', value: data.testInfo.name },
          { label: 'Tests Found', value: String(data.testInfo.testsCount) },
          { label: 'Subjects', value: subjectsText },
        ]),
      );
    } else {
      content.push(
        this.headerFooter.buildInfoCard('Test Information', [
          { label: 'Test Name', value: data.testInfo.name },
          { label: 'Subject', value: data.testInfo.subject },
          { label: 'Type', value: this.formatTestType(data.testInfo.testType) },
          {
            label: 'Total Marks',
            value: String(data.testInfo.totalMarks ?? '-'),
          },
          {
            label: 'Duration',
            value: data.testInfo.duration
              ? `${data.testInfo.duration} min`
              : '-',
          },
          {
            label: 'Date',
            value: data.testInfo.date
              ? new Date(data.testInfo.date).toLocaleDateString()
              : '-',
          },
        ]),
      );
    }

    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Students', value: String(summary.totalStudents ?? 0) },
        { label: 'Total Attempts', value: String(summary.totalAttempts ?? 0) },
        { label: 'Avg Score', value: String(summary.avgScore ?? 0) },
        { label: 'Avg Percentage', value: `${summary.avgPercentage ?? 0}%` },
        { label: 'Highest Score', value: String(summary.highestScore ?? '-') },
        { label: 'Lowest Score', value: String(summary.lowestScore ?? '-') },
      ]),
    );

    if (data.questionAnalysis?.length) {
      const caption = isAggregated
        ? 'How students performed on each question across all tests of this type'
        : 'How students performed on each question in this test';
      content.push({ text: 'Question Analysis', style: 'sectionHeader' });
      content.push({ text: caption, style: 'sectionCaption' });
      content.push(
        this.tableService.buildTable(
          ['Q#', 'Attempts', 'Correct', 'Wrong', 'Avg Time (s)'],
          data.questionAnalysis.map((q: any) => [
            q.questionNo ?? '-',
            q.totalAttempts ?? q.attempts,
            q.correct,
            q.incorrect,
            q.avgTime ?? '-',
          ]),
          { widths: ['auto', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    if (data.leaderboard?.entries?.length) {
      content.push({ text: 'Leaderboard', style: 'sectionHeader' });
      content.push({
        text: 'Top 3 students ranked by their average position across all test types',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    this.addDistributionSections(content, data);
  }

  private buildInstituteReport(data: any, content: Content[]): void {
    content.push(
      this.buildInfoCard('Institute Information', [
        { label: 'Institute', value: data.instituteInfo.name },
        { label: 'Email', value: data.instituteInfo.email || '-' },
        { label: 'Phone', value: data.instituteInfo.phone || '-' },
      ]),
    );

    const summary = data.summary || {};
    content.push(
      this.buildMetricGrid([
        { label: 'Total Students', value: String(summary.totalStudents ?? 0) },
        { label: 'Total Courses', value: String(summary.totalCourses ?? 0) },
        { label: 'Total Tests', value: String(summary.totalTests ?? 0) },
        { label: 'Tests Attempted', value: String(summary.testAttempts ?? 0) },
        {
          label: 'Tests Completed',
          value: String(summary.totalCompleted ?? 0),
        },
        { label: 'Avg Percentage', value: `${summary.avgPercentage ?? 0}%` },
      ]),
    );

    if (data.coursePerformance?.length) {
      content.push({ text: 'Course Performance', style: 'sectionHeader' });
      content.push({
        text: 'How students performed across the courses in this institute',
        style: 'sectionCaption',
      });
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
          { widths: ['*', 'auto', 'auto', 'auto', 'auto'] },
        ),
      );
    }

    if (data.subjectPerformance?.length) {
      content.push({ text: 'Subject Performance', style: 'sectionHeader' });
      content.push({
        text: 'How students performed in each subject across all tests',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          ['Subject', 'Tests', 'Avg %'],
          data.subjectPerformance.map((s: any) => [
            s.subjectName || s.subject,
            s.totalTests ?? s.testsAttempted ?? s.totalAttempted,
            `${s.averageScore ?? s.avgPercentage}%`,
          ]),
          { widths: ['*', 'auto', 'auto'] },
        ),
      );
    }

    if (data.leaderboard?.entries?.length) {
      content.push({ text: 'Leaderboard', style: 'sectionHeader' });
      content.push({
        text: 'Top 3 students ranked by their average position across all test types',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    this.addDistributionSections(content, data);
  }

  private buildOverallReport(data: any, content: Content[]): void {
    this.addSectionHeader(content, 'System Overview');
    content.push({
      text: 'High-level summary of the entire platform',
      style: 'sectionCaption',
    });
    content.push(
      this.buildMetricGrid([
        {
          label: 'Total Institutes',
          value: String(data.summary.totalInstitutes ?? 0),
        },
        {
          label: 'Total Students',
          value: String(data.summary.totalStudents ?? 0),
        },
        {
          label: 'Total Courses',
          value: String(data.summary.totalCourses ?? 0),
        },
        { label: 'Total Tests', value: String(data.summary.totalTests ?? 0) },
        {
          label: 'Tests Attempted',
          value: String(data.summary.testAttempts ?? 0),
        },
        {
          label: 'Tests Completed',
          value: String(data.summary.totalCompleted ?? 0),
        },
        {
          label: 'System Avg %',
          value: `${data.summary.avgPercentage ?? data.summary.averageScore ?? 0}%`,
        },
      ]),
    );

    if (data.leaderboard?.entries?.length) {
      this.addSectionHeader(content, 'Leaderboard');
      content.push({
        text: 'Top-performing students across the platform',
        style: 'sectionCaption',
      });
      const headers = [
        'Student',
        ...data.leaderboard.testTypes.map((tt: string) =>
          this.formatTestType(tt),
        ),
      ];
      const colWidths = ['*', ...data.leaderboard.testTypes.map(() => 'auto')];
      content.push(
        this.tableService.buildTable(
          headers,
          data.leaderboard.entries.map((e: any) => [
            e.studentName,
            ...data.leaderboard.testTypes.map(
              (tt: string) => e.testTypeRanks[tt],
            ),
          ]),
          { widths: colWidths },
        ),
      );

      if (data.leaderboard.analytics?.totalStudents > 0) {
        content.push({
          text: `Total Students: ${data.leaderboard.analytics.totalStudents}`,
          fontSize: FONT_SIZES.small,
          color: PDF_COLORS.body,
          margin: [0, 2, 0, 8],
        } as any);
      }
    }

    if (data.institutePerformance?.length) {
      this.addSectionHeader(content, 'Institute Performance');
      content.push({
        text: 'Performance breakdown by institute',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildTable(
          [
            'Institute',
            'Attempted Tests',
            'Completed Tests',
            'Students',
            'Avg %',
          ],
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
      content.push({
        text: 'Average scores across subjects',
        style: 'sectionCaption',
      });
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
      content.push({
        text: `Score Distribution: ${dist.subjectName}`,
        style: 'sectionHeader',
      });
      content.push({
        text: 'How students are performing across different score ranges for each type of test',
        style: 'sectionCaption',
      });
      content.push(
        this.tableService.buildDistributionTable(
          dist.distributions.map((d: any) => ({
            testType: this.formatTestType(d.testType),
            ranges: [
              d.range0to40,
              d.range41to60,
              d.range61to80,
              d.range81to100,
            ],
          })),
        ),
      );
    }
  }

  private addSectionHeader(content: Content[], text: string): void {
    content.push({ text, style: 'sectionHeader' });
  }
}
