import { Injectable } from '@nestjs/common';
import { Report, ReportType } from '../schemas/report.schema';
import { jsPDF } from 'jspdf';

@Injectable()
export class PdfReportService {
  async generateReport(data: any, report: Report): Promise<Buffer> {
    const doc = new jsPDF();

    // Start building PDF based on report type
    this.buildReportHeader(doc, report);

    switch (report.reportType) {
      case ReportType.STUDENT:
        await this.buildStudentReport(doc, data);
        break;
      case ReportType.SUBJECT:
        await this.buildSubjectReport(doc, data);
        break;
      case ReportType.COURSE:
        await this.buildCourseReport(doc, data);
        break;
      case ReportType.PACKAGE:
        await this.buildPackageReport(doc, data);
        break;
      case ReportType.TEST:
        await this.buildTestReport(doc, data);
        break;
      case ReportType.INSTITUTE:
        await this.buildInstituteReport(doc, data);
        break;
      case ReportType.OVERALL:
        await this.buildOverallReport(doc, data);
        break;
    }

    // Return the PDF as a buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  private buildReportHeader(doc: jsPDF, report: Report): void {
    doc.setFontSize(20);
    doc.text(report.name, doc.internal.pageSize.width / 2, 20, {
      align: 'center',
    });

    if (report.description) {
      doc.setFontSize(12);
      doc.text(report.description, doc.internal.pageSize.width / 2, 35, {
        align: 'center',
      });
    }

    doc.setFontSize(10);
    const date = new Date().toLocaleString();
    doc.text(`Generated on: ${date}`, doc.internal.pageSize.width - 20, 45, {
      align: 'right',
    });

    doc.setLineWidth(0.5);
    doc.line(20, 50, doc.internal.pageSize.width - 20, 50);
  }

  private async buildStudentReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Student Information
    doc.setFontSize(16);
    doc.text('Student Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Name: ${data.studentInfo.name}`, margin, yPos);
    yPos += 7;
    doc.text(`Email: ${data.studentInfo.email}`, margin, yPos);
    yPos += 7;
    doc.text(`Phone: ${data.studentInfo.phone || 'N/A'}`, margin, yPos);
    yPos += 7;
    doc.text(`Institute: ${data.studentInfo.institute}`, margin, yPos);
    yPos += 15;

    // Performance Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Completed Tests: ${data.summary.completedTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 7;
    doc.text(
      `Total Score: ${data.summary.totalScore} out of ${data.summary.totalPossibleScore}`,
      margin,
      yPos,
    );
    yPos += 15;

    // Subject Performance
    if (data.subjectPerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Subject Performance', margin, yPos);
      yPos += 10;

      // Table headers
      doc.setFontSize(10);
      const headers = [
        'Subject',
        'Total Tests',
        'Completed',
        'Average Score',
        'Total Score',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      // Table rows
      data.subjectPerformance.forEach((subject: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(subject.subject, margin, yPos);
        doc.text(subject.totalTests.toString(), margin + colWidth, yPos);
        doc.text(
          subject.completedTests.toString(),
          margin + 2 * colWidth,
          yPos,
        );
        doc.text(`${subject.averageScore}%`, margin + 3 * colWidth, yPos);
        doc.text(
          `${subject.totalScore}/${subject.totalPossibleScore}`,
          margin + 4 * colWidth,
          yPos,
        );
        yPos += 7;
      });
    }
  }

  private async buildSubjectReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Subject Information
    doc.setFontSize(16);
    doc.text('Subject Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Name: ${data.subjectInfo.name}`, margin, yPos);
    yPos += 15;

    // Performance Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Completed Tests: ${data.summary.completedTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 7;
    doc.text(
      `Total Score: ${data.summary.totalScore}/${data.summary.totalPossibleScore}`,
      margin,
      yPos,
    );
    yPos += 15;

    // Test Performance
    if (data.testPerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Test Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = ['Test Name', 'Attempts', 'Completed', 'Avg Score'];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.testPerformance.forEach((test: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(test.test, margin, yPos);
        doc.text(test.attempts.toString(), margin + colWidth, yPos);
        doc.text(test.completed.toString(), margin + 2 * colWidth, yPos);
        doc.text(`${test.averageScore}%`, margin + 3 * colWidth, yPos);
        yPos += 7;
      });
    }
  }

  private async buildCourseReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Course Information
    doc.setFontSize(16);
    doc.text('Course Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Name: ${data.courseInfo.name}`, margin, yPos);
    yPos += 7;
    doc.text(`Code: ${data.courseInfo.code}`, margin, yPos);
    yPos += 15;

    // Performance Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Completed Tests: ${data.summary.completedTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 7;
    doc.text(
      `Total Score: ${data.summary.totalScore}/${data.summary.totalPossibleScore}`,
      margin,
      yPos,
    );
    yPos += 7;
    doc.text(`Number of Subjects: ${data.summary.subjectCount}`, margin, yPos);
    yPos += 15;

    // Subject Performance
    if (data.subjectPerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Subject Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = ['Subject', 'Total Tests', 'Completed', 'Avg Score'];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.subjectPerformance.forEach((subject: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(subject.name, margin, yPos);
        doc.text(subject.totalTests.toString(), margin + colWidth, yPos);
        doc.text(
          subject.completedTests.toString(),
          margin + 2 * colWidth,
          yPos,
        );
        doc.text(`${subject.averageScore}%`, margin + 3 * colWidth, yPos);
        yPos += 7;
      });
    }
  }

  private async buildPackageReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Package Information
    doc.setFontSize(16);
    doc.text('Package Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Description: ${data.packageInfo.description}`, margin, yPos);
    yPos += 15;

    // Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Courses: ${data.summary.totalCourses}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Tests Attempted: ${data.summary.testsAttempted}`, margin, yPos);
    yPos += 7;
    doc.text(`Tests Completed: ${data.summary.testsCompleted}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 15;

    // Course Performance
    if (data.coursePerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Course Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = [
        'Course',
        'Tests Attempted',
        'Completed',
        'Avg Score',
        'Students',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.coursePerformance.forEach((course: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(course.course, margin, yPos);
        doc.text(course.testsAttempted.toString(), margin + colWidth, yPos);
        doc.text(course.testsCompleted.toString(), margin + 2 * colWidth, yPos);
        doc.text(course.averageScore, margin + 3 * colWidth, yPos);
        doc.text(course.studentCount.toString(), margin + 4 * colWidth, yPos);
        yPos += 7;
      });
    }
  }

  private async buildTestReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Test Information
    doc.setFontSize(16);
    doc.text('Test Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Name: ${data.testInfo.name}`, margin, yPos);
    yPos += 7;
    doc.text(`Subject: ${data.testInfo.subject || '-'}`, margin, yPos);
    yPos += 15;

    // Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Attempts: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Completed Tests: ${data.summary.completedTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 15;

    // Question Analysis
    if (data.questionAnalysis?.length > 0) {
      doc.setFontSize(16);
      doc.text('Question Analysis', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = [
        'Question',
        'Attempts',
        'Correct',
        'Correct %',
        'Avg Time',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.questionAnalysis.forEach((question: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(question.questionId, margin, yPos);
        doc.text(question.attempts.toString(), margin + colWidth, yPos);
        doc.text(question.correct.toString(), margin + 2 * colWidth, yPos);
        doc.text(question.correctPercentage, margin + 3 * colWidth, yPos);
        doc.text(question.averageTime, margin + 4 * colWidth, yPos);
        yPos += 7;
      });
    }

    // Student Results
    if (data.studentResults?.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.text('Student Results', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = [
        'Student',
        'Score',
        'Percentage',
        'Correct',
        'Incorrect',
        'Avg Time',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.studentResults.forEach((result: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(result.student.name, margin, yPos);
        doc.text(result.score.toString(), margin + colWidth, yPos);
        doc.text(result.percentage.toString(), margin + 2 * colWidth, yPos);
        doc.text(result.correctAnswers.toString(), margin + 3 * colWidth, yPos);
        doc.text(
          result.incorrectAnswers.toString(),
          margin + 4 * colWidth,
          yPos,
        );
        doc.text(result.averageTimePerQuestion, margin + 5 * colWidth, yPos);
        yPos += 7;
      });
    }
  }

  private async buildInstituteReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // Institute Information
    doc.setFontSize(16);
    doc.text('Institute Information', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Name: ${data.instituteInfo.name}`, margin, yPos);
    yPos += 15;

    // Summary
    doc.setFontSize(16);
    doc.text('Performance Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Students: ${data.summary.totalStudents}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Courses: ${data.summary.totalCourses}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Test Attempts: ${data.summary.testAttempts}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 15;

    // Course Performance
    if (data.coursePerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Course Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = [
        'Course',
        'Tests Attempted',
        'Completed',
        'Students',
        'Avg Score',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.coursePerformance.forEach((course: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(course.courseName, margin, yPos);
        doc.text(course.testsAttempted.toString(), margin + colWidth, yPos);
        doc.text(course.testsCompleted.toString(), margin + 2 * colWidth, yPos);
        doc.text(course.studentCount.toString(), margin + 3 * colWidth, yPos);
        doc.text(course.averageScore.toString(), margin + 4 * colWidth, yPos);
        yPos += 7;
      });
    }

    // Subject Performance
    if (data.subjectPerformance?.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.text('Subject Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = ['Subject', 'Total Tests', 'Completed', 'Avg Score'];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.subjectPerformance.forEach((subject: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(subject.subject, margin, yPos);
        doc.text(subject.totalTests.toString(), margin + colWidth, yPos);
        doc.text(
          subject.completedTests.toString(),
          margin + 2 * colWidth,
          yPos,
        );
        doc.text(`${subject.averageScore}%`, margin + 3 * colWidth, yPos);
        yPos += 7;
      });
    }
  }

  private async buildOverallReport(doc: jsPDF, data: any): Promise<void> {
    let yPos = 60;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;

    // System Summary
    doc.setFontSize(16);
    doc.text('System Summary', margin, yPos);
    yPos += 10;

    doc.setFontSize(12);
    doc.text(`Total Institutes: ${data.summary.totalInstitutes}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Students: ${data.summary.totalStudents}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Courses: ${data.summary.totalCourses}`, margin, yPos);
    yPos += 7;
    doc.text(`Total Tests: ${data.summary.totalTests}`, margin, yPos);
    yPos += 7;
    doc.text(`Test Attempts: ${data.summary.testAttempts}`, margin, yPos);
    yPos += 7;
    doc.text(`Average Score: ${data.summary.averageScore}%`, margin, yPos);
    yPos += 15;

    // Institute Performance
    if (data.institutePerformance?.length > 0) {
      doc.setFontSize(16);
      doc.text('Institute Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = [
        'Institute',
        'Tests Attempted',
        'Completed',
        'Students',
        'Avg Score',
      ];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.institutePerformance.forEach((institute: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(institute.institute, margin, yPos);
        doc.text(institute.testsAttempted.toString(), margin + colWidth, yPos);
        doc.text(
          institute.testsCompleted.toString(),
          margin + 2 * colWidth,
          yPos,
        );
        doc.text(
          institute.studentCount.toString(),
          margin + 3 * colWidth,
          yPos,
        );
        doc.text(institute.averageScore, margin + 4 * colWidth, yPos);
        yPos += 7;
      });
    }

    // Subject Performance
    if (data.subjectPerformance?.length > 0) {
      doc.addPage();
      yPos = 20;

      doc.setFontSize(16);
      doc.text('Subject Performance', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const headers = ['Subject', 'Total Tests', 'Completed', 'Avg Score'];
      const colWidth = (pageWidth - 2 * margin) / headers.length;

      headers.forEach((header, i) => {
        doc.text(header, margin + i * colWidth, yPos);
      });
      yPos += 7;

      data.subjectPerformance.forEach((subject: any) => {
        if (yPos > doc.internal.pageSize.height - 20) {
          doc.addPage();
          yPos = 20;
        }

        doc.text(subject.subject, margin, yPos);
        doc.text(subject.totalTests.toString(), margin + colWidth, yPos);
        doc.text(
          subject.completedTests.toString(),
          margin + 2 * colWidth,
          yPos,
        );
        doc.text(`${subject.averageScore}%`, margin + 3 * colWidth, yPos);
        yPos += 7;
      });
    }
  }
}
