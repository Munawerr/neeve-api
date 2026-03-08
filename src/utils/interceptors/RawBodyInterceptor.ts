import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class RawBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const chunks: Buffer[] = [];

    return new Observable((observer) => {
      request.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      request.on('end', () => {
        const rawBody = Buffer.concat(chunks);
        request.rawBody = rawBody;
        observer.next();
        observer.complete();
      });

      request.on('error', (error) => {
        observer.error(error);
      });
    }).pipe(() => next.handle());
  }
}
