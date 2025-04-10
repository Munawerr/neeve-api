declare module 'pdfkit' {
  import PDFDocument from 'pdfkit';
  export = PDFDocument;
}

declare namespace PDFKit {
  interface PDFDocument {
    // Document properties
    page: {
      width: number;
      height: number;
    };
    y: number;
    x: number;

    // Text methods
    fontSize(size: number): PDFDocument;
    text(
      text: string,
      x?: number | TextOptions,
      y?: number,
      options?: TextOptions,
    ): PDFDocument;

    // Content positioning
    moveDown(lines?: number): PDFDocument;
    moveTo(x: number, y: number): PDFDocument;

    // Drawing operations
    lineTo(x: number, y: number): PDFDocument;
    stroke(): PDFDocument;

    // Events
    on(event: string, callback: Function): PDFDocument;

    // Document manipulation
    addPage(options?: PDFDocumentOptions): PDFDocument;
    end(): PDFDocument;
  }

  interface TextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    width?: number;
    height?: number;
    continued?: boolean;
    lineBreak?: boolean;
    // Add any other text options used in the code
  }

  interface PDFDocumentOptions {
    margin?:
      | number
      | { top: number; left: number; bottom: number; right: number };
    // Add any other document options used in the code
  }
}
