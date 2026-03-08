declare module 'html-to-text' {
  interface IOptions {
    wordwrap?: boolean | number;
    tables?: boolean | string[];
    baseUrl?: string;
    hideLinkHrefIfSameAsText?: boolean;
    ignoreHref?: boolean;
    ignoreImage?: boolean;
    preserveNewlines?: boolean;
    decodeOptions?: { isAttributeValue: boolean; level: string };
    [key: string]: any;
  }

  interface HtmlToText {
    convert(html: string, options?: IOptions): string;
    [key: string]: any;
  }

  const htmlToText: HtmlToText;
  export = htmlToText;
}
