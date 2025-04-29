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
    doc.text(`Name: ${data.studentInfo.full_name}`, margin, yPos);
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
    doc.setFontSize(16);
    doc.text('Package Report', 20, 60);
    doc.setFontSize(12);
    doc.text('Package-specific report details would be included here.', 20, 80);
  }

  private async buildTestReport(doc: jsPDF, data: any): Promise<void> {
    doc.setFontSize(16);
    doc.text('Test Report', 20, 60);
    doc.setFontSize(12);
    doc.text('Test-specific report details would be included here.', 20, 80);
  }

  private async buildInstituteReport(doc: jsPDF, data: any): Promise<void> {
    doc.setFontSize(16);
    doc.text('Institute Report', 20, 60);
    doc.setFontSize(12);
    doc.text(
      'Institute-specific report details would be included here.',
      20,
      80,
    );
  }

  private async buildOverallReport(doc: jsPDF, data: any): Promise<void> {
    doc.setFontSize(16);
    doc.text('Overall System Report', 20, 60);
    doc.setFontSize(12);
    doc.text('Overall system report details would be included here.', 20, 80);
  }
}
