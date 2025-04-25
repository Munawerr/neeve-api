import { Injectable } from '@nestjs/common';
import { Report, ReportType } from '../schemas/report.schema';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelReportService {
  async generateReport(data: any, report: Report): Promise<Buffer> {
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'VRIKSH API';
    workbook.lastModifiedBy = 'VRIKSH API';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add a worksheet based on report type
    switch (report.reportType) {
      case ReportType.STUDENT:
        await this.buildStudentReport(workbook, data, report);
        break;
      case ReportType.SUBJECT:
        await this.buildSubjectReport(workbook, data, report);
        break;
      case ReportType.COURSE:
        await this.buildCourseReport(workbook, data, report);
        break;
      case ReportType.PACKAGE:
        await this.buildPackageReport(workbook, data, report);
        break;
      case ReportType.TEST:
        await this.buildTestReport(workbook, data, report);
        break;
      case ReportType.INSTITUTE:
        await this.buildInstituteReport(workbook, data, report);
        break;
      case ReportType.OVERALL:
        await this.buildOverallReport(workbook, data, report);
        break;
    }

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as Buffer;
  }

  private addReportHeader(worksheet: ExcelJS.Worksheet, report: Report): void {
    // Add report title
    const titleRow = worksheet.addRow([report.name]);
    titleRow.font = { size: 16, bold: true };
    worksheet.mergeCells(`A1:G1`);
    titleRow.alignment = { horizontal: 'center' };
    
    // Add report description if available
    if (report.description) {
      const descRow = worksheet.addRow([report.description]);
      worksheet.mergeCells(`A2:G2`);
      descRow.alignment = { horizontal: 'center' };
    }
    
    // Add generation date
    const dateRow = worksheet.addRow([`Generated on: ${new Date().toLocaleString()}`]);
    worksheet.mergeCells(`A${dateRow.number}:G${dateRow.number}`);
    dateRow.alignment = { horizontal: 'right' };
    
    // Add empty row for spacing
    worksheet.addRow([]);
  }

  private async buildStudentReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create worksheets for student report
    const summarySheet = workbook.addWorksheet('Summary');
    const subjectsSheet = workbook.addWorksheet('Subject Performance');
    const testResultsSheet = workbook.addWorksheet('Test Results');
    
    // Build summary sheet
    this.addReportHeader(summarySheet, report);
    
    // Student info section
    summarySheet.addRow(['Student Information']);
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true, size: 14 };
    
    summarySheet.addRow(['Name:', data.studentInfo.name]);
    summarySheet.addRow(['Email:', data.studentInfo.email]);
    summarySheet.addRow(['Phone:', data.studentInfo.phone || 'N/A']);
    summarySheet.addRow(['Institute:', data.studentInfo.institute]);
    summarySheet.addRow([]);
    
    // Performance summary
    summarySheet.addRow(['Performance Summary']);
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true, size: 14 };
    
    summarySheet.addRow(['Total Tests:', data.summary.totalTests]);
    summarySheet.addRow(['Completed Tests:', data.summary.completedTests]);
    summarySheet.addRow(['Average Score:', `${data.summary.averageScore}%`]);
    summarySheet.addRow(['Total Score:', `${data.summary.totalScore} out of ${data.summary.totalPossibleScore}`]);
    
    // Format the summary sheet
    summarySheet.columns = [
      { width: 20 },
      { width: 30 }
    ];

    // Build subject performance sheet
    this.addReportHeader(subjectsSheet, report);
    
    // Add headers
    const subjectHeaders = ['Subject', 'Total Tests', 'Completed Tests', 'Average Score', 'Total Score', 'Total Possible Score'];
    const headerRow = subjectsSheet.addRow(subjectHeaders);
    headerRow.font = { bold: true };
    
    // Style the header
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add subject data
    if (data.subjectPerformance && data.subjectPerformance.length > 0) {
      data.subjectPerformance.forEach((subject: any) => {
        const row = subjectsSheet.addRow([
          subject.subject,
          subject.totalTests,
          subject.completedTests,
          `${subject.averageScore}%`,
          subject.totalScore,
          subject.totalPossibleScore
        ]);
        
        // Add borders to cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    } else {
      subjectsSheet.addRow(['No subject performance data available']);
    }
    
    // Format subject sheet columns
    subjectsSheet.columns = [
      { width: 30 }, // Subject
      { width: 15 }, // Total Tests
      { width: 15 }, // Completed Tests
      { width: 15 }, // Average Score
      { width: 15 }, // Total Score
      { width: 20 }  // Total Possible Score
    ];

    // Build test results sheet
    this.addReportHeader(testResultsSheet, report);
    
    // Add headers
    const testHeaders = ['Test Name', 'Subject', 'Status', 'Started', 'Finished', 'Score', 'Total Marks', 'Percentage'];
    const testHeaderRow = testResultsSheet.addRow(testHeaders);
    testHeaderRow.font = { bold: true };
    
    // Style the header
    testHeaderRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Add test data
    if (data.testResults && data.testResults.length > 0) {
      data.testResults.forEach((result: any) => {
        const startDate = new Date(result.startedAt).toLocaleDateString();
        const finishDate = result.finishedAt ? new Date(result.finishedAt).toLocaleDateString() : 'N/A';
        
        const row = testResultsSheet.addRow([
          result.testName,
          result.subject,
          result.status,
          startDate,
          finishDate,
          result.score,
          result.totalMarks,
          result.percentage
        ]);
        
        // Add borders to cells
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    } else {
      testResultsSheet.addRow(['No test results available']);
    }
    
    // Format test results sheet columns
    testResultsSheet.columns = [
      { width: 30 }, // Test Name
      { width: 20 }, // Subject
      { width: 15 }, // Status
      { width: 15 }, // Started
      { width: 15 }, // Finished
      { width: 10 }, // Score
      { width: 15 }, // Total Marks
      { width: 15 }  // Percentage
    ];
  }

  private async buildSubjectReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    const testPerformanceSheet = workbook.addWorksheet('Test Performance');
    const studentResultsSheet = workbook.addWorksheet('Student Results');
    
    // Add header to summary sheet
    this.addReportHeader(summarySheet, report);
    
    // Subject info
    summarySheet.addRow(['Subject Information']);
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true, size: 14 };
    summarySheet.addRow(['Subject Name:', data.subjectInfo.name]);
    summarySheet.addRow([]);
    
    // Summary section
    summarySheet.addRow(['Performance Summary']);
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true, size: 14 };
    summarySheet.addRow(['Total Tests:', data.summary.totalTests]);
    summarySheet.addRow(['Completed Tests:', data.summary.completedTests]);
    summarySheet.addRow(['Average Score:', `${data.summary.averageScore}%`]);
    summarySheet.addRow(['Total Score:', `${data.summary.totalScore} out of ${data.summary.totalPossibleScore}`]);
    
    // Similar implementation for the test performance and student results sheets
    // would continue here, similar to the student report implementation...
  }

  private async buildCourseReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create a basic course report sheet
    const courseSheet = workbook.addWorksheet('Course Report');
    this.addReportHeader(courseSheet, report);
    courseSheet.addRow(['Course Report']);
    courseSheet.getRow(courseSheet.rowCount).font = { bold: true, size: 14 };
    courseSheet.addRow(['Course-specific report details would be included here.']);
  }

  private async buildPackageReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create a basic package report sheet
    const packageSheet = workbook.addWorksheet('Package Report');
    this.addReportHeader(packageSheet, report);
    packageSheet.addRow(['Package Report']);
    packageSheet.getRow(packageSheet.rowCount).font = { bold: true, size: 14 };
    packageSheet.addRow(['Package-specific report details would be included here.']);
  }

  private async buildTestReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create a basic test report sheet
    const testSheet = workbook.addWorksheet('Test Report');
    this.addReportHeader(testSheet, report);
    testSheet.addRow(['Test Report']);
    testSheet.getRow(testSheet.rowCount).font = { bold: true, size: 14 };
    testSheet.addRow(['Test-specific report details would be included here.']);
  }

  private async buildInstituteReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create a basic institute report sheet
    const instituteSheet = workbook.addWorksheet('Institute Report');
    this.addReportHeader(instituteSheet, report);
    instituteSheet.addRow(['Institute Report']);
    instituteSheet.getRow(instituteSheet.rowCount).font = { bold: true, size: 14 };
    instituteSheet.addRow(['Institute-specific report details would be included here.']);
  }

  private async buildOverallReport(workbook: ExcelJS.Workbook, data: any, report: Report): Promise<void> {
    // Create a basic overall report sheet
    const overallSheet = workbook.addWorksheet('Overall Report');
    this.addReportHeader(overallSheet, report);
    overallSheet.addRow(['Overall System Report']);
    overallSheet.getRow(overallSheet.rowCount).font = { bold: true, size: 14 };
    overallSheet.addRow(['Overall system report details would be included here.']);
  }
}