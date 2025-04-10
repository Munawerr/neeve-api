import { Injectable } from '@nestjs/common';
import { Report, ReportType } from '../schemas/report.schema';
import PDFDocument from 'pdfkit';

@Injectable()
export class PdfReportService {
  async generateReport(data: any, report: Report): Promise<Buffer> {
    // Create a buffer to store the PDF
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });

    // Collect PDF data chunks
    doc.on('data', buffers.push.bind(buffers));
    
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

    // End the document
    doc.end();

    // Return a promise that resolves with the PDF buffer
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
    });
  }

  private buildReportHeader(doc: PDFKit.PDFDocument, report: Report): void {
    // Add report title
    doc.fontSize(20).text(report.name, { align: 'center' });
    
    // Add report description if available
    if (report.description) {
      doc.moveDown().fontSize(12).text(report.description, { align: 'center' });
    }
    
    // Add report generation date
    doc.moveDown()
       .fontSize(10)
       .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
    
    // Add horizontal line
    doc.moveDown()
       .moveTo(50, doc.y)
       .lineTo(doc.page.width - 50, doc.y)
       .stroke();
    
    doc.moveDown();
  }

  private async buildStudentReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    // Add student information section
    doc.fontSize(16).text('Student Information');
    doc.moveDown()
       .fontSize(12)
       .text(`Name: ${data.studentInfo.name}`)
       .text(`Email: ${data.studentInfo.email}`)
       .text(`Phone: ${data.studentInfo.phone || 'N/A'}`)
       .text(`Institute: ${data.studentInfo.institute}`);

    // Add performance summary section
    doc.moveDown().fontSize(16).text('Performance Summary');
    doc.moveDown()
       .fontSize(12)
       .text(`Total Tests: ${data.summary.totalTests}`)
       .text(`Completed Tests: ${data.summary.completedTests}`)
       .text(`Average Score: ${data.summary.averageScore}%`)
       .text(`Total Score: ${data.summary.totalScore} out of ${data.summary.totalPossibleScore}`);

    // Add subject-wise performance section
    doc.moveDown().fontSize(16).text('Subject Performance');
    
    if (data.subjectPerformance && data.subjectPerformance.length > 0) {
      // Create a table-like structure for subject performance
      const tableTop = doc.y + 10;
      doc.fontSize(10);
      
      // Add table headers
      doc.text('Subject', 50, tableTop)
         .text('Total Tests', 200, tableTop)
         .text('Completed', 280, tableTop)
         .text('Average Score', 350, tableTop)
         .text('Total Score', 450, tableTop);
      
      // Add a line after headers
      doc.moveDown()
         .moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      
      // Add table rows
      let yPosition = doc.y + 5;
      
      data.subjectPerformance.forEach((subject: any) => {
        // Check if we need a new page
        if (yPosition + 20 > doc.page.height - 50) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(subject.subject, 50, yPosition)
           .text(subject.totalTests.toString(), 200, yPosition)
           .text(subject.completedTests.toString(), 280, yPosition)
           .text(`${subject.averageScore}%`, 350, yPosition)
           .text(`${subject.totalScore}/${subject.totalPossibleScore}`, 450, yPosition);
        
        yPosition += 20;
      });
    } else {
      doc.moveDown().text('No subject performance data available.');
    }

    // Add test results section
    doc.moveDown().fontSize(16).text('Test Results');
    
    if (data.testResults && data.testResults.length > 0) {
      // Add a page break if needed
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }
      
      // Create a table-like structure for test results
      const tableTop = doc.y + 10;
      doc.fontSize(8);
      
      // Add table headers
      doc.text('Test Name', 50, tableTop)
         .text('Subject', 150, tableTop)
         .text('Status', 230, tableTop)
         .text('Started', 280, tableTop)
         .text('Finished', 350, tableTop)
         .text('Score', 420, tableTop)
         .text('Percentage', 480, tableTop);
      
      // Add a line after headers
      doc.moveTo(50, tableTop + 15)
         .lineTo(doc.page.width - 50, tableTop + 15)
         .stroke();
      
      // Add table rows
      let yPosition = tableTop + 20;
      
      data.testResults.forEach((result: any) => {
        // Check if we need a new page
        if (yPosition + 15 > doc.page.height - 50) {
          doc.addPage();
          yPosition = 50;
          
          // Repeat headers on new page
          doc.fontSize(8)
             .text('Test Name', 50, yPosition)
             .text('Subject', 150, yPosition)
             .text('Status', 230, yPosition)
             .text('Started', 280, yPosition)
             .text('Finished', 350, yPosition)
             .text('Score', 420, yPosition)
             .text('Percentage', 480, yPosition);
          
          doc.moveTo(50, yPosition + 15)
             .lineTo(doc.page.width - 50, yPosition + 15)
             .stroke();
          
          yPosition += 20;
        }
        
        const startDate = new Date(result.startedAt).toLocaleDateString();
        const finishDate = result.finishedAt ? new Date(result.finishedAt).toLocaleDateString() : 'N/A';
        
        doc.text(result.testName, 50, yPosition)
           .text(result.subject, 150, yPosition)
           .text(result.status, 230, yPosition)
           .text(startDate, 280, yPosition)
           .text(finishDate, 350, yPosition)
           .text(result.score.toString(), 420, yPosition)
           .text(result.percentage.toString(), 480, yPosition);
        
        yPosition += 15;
      });
    } else {
      doc.moveDown().text('No test results available.');
    }
  }

  private async buildSubjectReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    // Similar to student report but focused on a subject
    // Implementation would follow a similar pattern as buildStudentReport
    doc.fontSize(16).text(`Subject Report: ${data.subjectInfo.name}`);
    doc.moveDown().fontSize(12).text('Subject-specific report details would be included here.');
  }

  private async buildCourseReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    doc.fontSize(16).text('Course Report');
    doc.moveDown().fontSize(12).text('Course-specific report details would be included here.');
  }

  private async buildPackageReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    doc.fontSize(16).text('Package Report');
    doc.moveDown().fontSize(12).text('Package-specific report details would be included here.');
  }

  private async buildTestReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    doc.fontSize(16).text('Test Report');
    doc.moveDown().fontSize(12).text('Test-specific report details would be included here.');
  }

  private async buildInstituteReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    doc.fontSize(16).text('Institute Report');
    doc.moveDown().fontSize(12).text('Institute-specific report details would be included here.');
  }

  private async buildOverallReport(doc: PDFKit.PDFDocument, data: any): Promise<void> {
    doc.fontSize(16).text('Overall System Report');
    doc.moveDown().fontSize(12).text('Overall system report details would be included here.');
  }
}