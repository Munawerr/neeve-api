declare module 'aws-sdk' {
	export class S3 {
		constructor(options?: any);
		upload(params: any): { promise(): Promise<{ Location: string }> };
		deleteObject(params: any): { promise(): Promise<void> };
		getSignedUrlPromise(operation: string, params: any): Promise<string>;
	}
}
