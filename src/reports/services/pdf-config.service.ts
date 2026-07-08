import { Injectable, OnModuleInit } from '@nestjs/common';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as pdfMake from 'pdfmake';
import { TFontDictionary } from 'pdfmake/interfaces';

export const PDF_COLORS = {
  primary: '#27963c',
  primaryDark: '#1f6f2e',
  body: '#64748B',
  border: '#E2E8F0',
  rowAlt: '#F7F9FC',
  white: '#FFFFFF',
  black: '#213126',
  darkBg: '#24303F',
  danger: '#D34053',
  success: '#219653',
  warning: '#FFA70B',
};

export const PDF_MARGINS = {
  top: 40,
  bottom: 40,
  left: 40,
  right: 40,
};

export const FONT_SIZES = {
  title: 18,
  section: 14,
  subsection: 12,
  body: 10,
  small: 8,
};

@Injectable()
export class PdfConfigService implements OnModuleInit {
  private logoBase64: string = '';

  onModuleInit() {
    const fontsDir = join(process.cwd(), 'node_modules/pdfmake/fonts/Roboto');
    const fontDescriptors: TFontDictionary = {
      Roboto: {
        normal: join(fontsDir, 'Roboto-Regular.ttf'),
        bold: join(fontsDir, 'Roboto-Medium.ttf'),
        italics: join(fontsDir, 'Roboto-Italic.ttf'),
        bolditalics: join(fontsDir, 'Roboto-MediumItalic.ttf'),
      },
    };
    (pdfMake as any).fonts = fontDescriptors;

    try {
      const logoPath = join(__dirname, '..', 'assets', 'logo.png');
      const logoBuffer = readFileSync(logoPath);
      this.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch {
      const altPath = join(process.cwd(), 'src', 'reports', 'assets', 'logo.png');
      try {
        const logoBuffer = readFileSync(altPath);
        this.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
      } catch {
        this.logoBase64 = '';
      }
    }
  }

  getLogo(): string {
    return this.logoBase64;
  }

  getStyles(): Record<string, any> {
    return {
      title: {
        fontSize: FONT_SIZES.title,
        bold: true,
        color: PDF_COLORS.black,
        alignment: 'center',
        margin: [0, 0, 0, 4],
      },
      sectionHeader: {
        fontSize: FONT_SIZES.section,
        bold: true,
        color: PDF_COLORS.primary,
        margin: [0, 12, 0, 6],
      },
      subsectionHeader: {
        fontSize: FONT_SIZES.subsection,
        bold: true,
        color: PDF_COLORS.black,
        margin: [0, 8, 0, 4],
      },
      bodyText: {
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.black,
      },
      smallText: {
        fontSize: FONT_SIZES.small,
        color: PDF_COLORS.body,
      },
      tableHeader: {
        fontSize: FONT_SIZES.body,
        bold: true,
        color: PDF_COLORS.white,
        fillColor: PDF_COLORS.primary,
        alignment: 'center',
        margin: [4, 4, 4, 4],
      },
      tableCell: {
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.black,
        margin: [4, 4, 4, 4],
      },
      tableCellAlt: {
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.black,
        fillColor: PDF_COLORS.rowAlt,
        margin: [4, 4, 4, 4],
      },
      infoLabel: {
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.body,
        bold: true,
        width: 120,
      },
      infoValue: {
        fontSize: FONT_SIZES.body,
        color: PDF_COLORS.black,
      },
    };
  }
}
