import { Injectable } from '@nestjs/common';
import { Content } from 'pdfmake/interfaces';
import { PDF_COLORS, FONT_SIZES } from './pdf-config.service';

@Injectable()
export class PdfTableService {
  buildTable(
    headers: string[],
    rows: (string | number | null | undefined)[][],
    options?: {
      headerBackground?: string;
      headerColor?: string;
      alternateRowColor?: string;
      borderColor?: string;
      widths?: (string | number)[];
      layout?: string;
      margin?: number[];
    },
  ): Content {
    const {
      headerBackground = PDF_COLORS.primary,
      headerColor = PDF_COLORS.white,
      alternateRowColor = PDF_COLORS.rowAlt,
      borderColor = PDF_COLORS.border,
      widths = this.autoWidths(headers.length),
      margin = [0, 0, 0, 8],
    } = options || {};

    const headerRow: any[] = headers.map((header) => ({
      text: header,
      fontSize: FONT_SIZES.body,
      bold: true,
      color: headerColor,
      fillColor: headerBackground,
      alignment: 'center',
      margin: [4, 4, 4, 4],
      border: [true, true, true, true],
      borderColor: [borderColor, borderColor, borderColor, borderColor],
    }));

    const body: any[][] = [headerRow];

    rows.forEach((row, rowIndex) => {
      const isAlt = rowIndex % 2 === 1;
      const cells: any[] = row.map((cell, cellIndex) => ({
        text: cell ?? '-',
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.black,
        fillColor: isAlt ? alternateRowColor : undefined,
        alignment: cellIndex === 0 ? 'left' : 'center',
        noWrap: cellIndex !== 0,
        margin: [4, 3, 4, 3],
        border: [false, false, false, false],
      }));
      body.push(cells);
    });

    return {
      table: {
        widths,
        body,
        headerRows: 1,
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 1 || i === body.length ? 0.5 : 0),
        vLineWidth: () => 0,
        hLineColor: () => borderColor,
        paddingLeft: () => 4,
        paddingRight: () => 4,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
      margin,
    } as any;
  }

  buildDistributionTable(
    rows: { testType: string; ranges: number[] }[],
    options?: {
      margin?: number[];
    },
  ): Content {
    const headers = ['Test Type', '0% - 40%', '41% - 60%', '61% - 80%', '81% - 100%'];
    const data = rows.map((row) => [row.testType, ...row.ranges.map((r) => r.toString())]);
    return this.buildTable(headers, data, {
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      ...options,
    });
  }

  private autoWidths(count: number): string[] {
    if (count <= 3) {
      return Array(count).fill('*');
    }
    const result = new Array<string>(count);
    result[0] = '*';
    for (let i = 1; i < count; i++) {
      result[i] = 'auto';
    }
    return result;
  }
}
