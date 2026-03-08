declare module 'pdf-parse' {
  function pdfParse(
    dataBuffer: Buffer,
    options?: any,
  ): Promise<{ numpages: number; [key: string]: any }>;
  export = pdfParse;
}
