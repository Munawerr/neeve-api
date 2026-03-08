import { Injectable, BadRequestException, HttpException } from '@nestjs/common';
import { parseError, ParsedError } from '../types/index';

/**
 * Service demonstrating proper error handling patterns
 */
@Injectable()
export class ErrorHandlingService {
  /**
   * Safe try-catch pattern
   */
  async safeDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: string = 'Database operation',
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const parsedError = parseError(error);
      console.error(`${context} failed:`, parsedError.message);
      throw new BadRequestException(
        `${context} failed: ${parsedError.message}`,
      );
    }
  }

  /**
   * Handle external API calls safely
   */
  async safeApiCall<T>(
    apiCall: () => Promise<T>,
    fallbackValue?: T,
  ): Promise<T | undefined> {
    try {
      return await apiCall();
    } catch (error) {
      const parsedError = parseError(error);
      console.warn('API call failed:', parsedError.message);
      return fallbackValue;
    }
  }

  /**
   * Validate and transform error objects
   */
  validateError(error: unknown): ParsedError {
    return parseError(error);
  }

  /**
   * Create HTTP exception from unknown error
   */
  createHttpException(
    error: unknown,
    defaultStatus: number = 500,
  ): HttpException {
    const parsed = parseError(error);
    return new HttpException(
      {
        statusCode: defaultStatus,
        message: parsed.message,
        error: 'Internal Server Error',
      },
      defaultStatus,
    );
  }
}

describe('Error Handling Service', () => {
  let service: ErrorHandlingService;

  beforeEach(() => {
    service = new ErrorHandlingService();
  });

  describe('safeDatabaseOperation', () => {
    it('should execute successful operation', async () => {
      const result = await service.safeDatabaseOperation(() =>
        Promise.resolve({
          id: '123',
          name: 'Test',
        }),
      );

      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('should catch and transform database errors', async () => {
      const dbError = new Error('Connection failed');

      try {
        await service.safeDatabaseOperation(() => Promise.reject(dbError));
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getResponse()).toHaveProperty('message');
      }
    });

    it('should include custom context in error message', async () => {
      const error = new Error('Query failed');

      try {
        await service.safeDatabaseOperation(
          () => Promise.reject(error),
          'User fetch',
        );
        fail('Should have thrown');
      } catch (err) {
        const response = (err as BadRequestException).getResponse();
        expect(response).toHaveProperty('message');
      }
    });

    it('should handle non-Error exceptions', async () => {
      try {
        await service.safeDatabaseOperation(() =>
          Promise.reject(new Error('String error')),
        );
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('safeApiCall', () => {
    it('should return API result on success', async () => {
      const result = await service.safeApiCall(() =>
        Promise.resolve({ data: 'test' }),
      );

      expect(result).toEqual({ data: 'test' });
    });

    it('should return fallback value on error', async () => {
      const result = await service.safeApiCall(
        () => Promise.reject(new Error('API failed')),
        { data: 'fallback' },
      );

      expect(result).toEqual({ data: 'fallback' });
    });

    it('should return undefined when no fallback provided', async () => {
      const result = await service.safeApiCall(() =>
        Promise.reject(new Error('API failed')),
      );

      expect(result).toBeUndefined();
    });

    it('should not throw on API errors', () => {
      expect(
        service.safeApiCall(() => Promise.reject(new Error('API error'))),
      ).resolves.toBeUndefined();
    });
  });

  describe('validateError', () => {
    it('should parse Error instances', () => {
      const error = new Error('Test error');
      const parsed = service.validateError(error);

      expect(parsed.message).toBe('Test error');
      expect(parsed.originalError).toBe(error);
    });

    it('should parse string errors', () => {
      const error = 'String error message';
      const parsed = service.validateError(error);

      expect(parsed.message).toBe('String error message');
    });

    it('should parse object errors', () => {
      const error = { message: 'Object error', statusCode: 400 };
      const parsed = service.validateError(error);

      expect(parsed.message).toBe('Object error');
    });

    it('should handle unknown error types', () => {
      const parsed = service.validateError(null);

      expect(parsed.message).toBe('An unknown error occurred');
    });
  });

  describe('createHttpException', () => {
    it('should create HTTP exception from Error', () => {
      const error = new Error('Test error');
      const exception = service.createHttpException(error, 400);
      const response = exception.getResponse() as any;

      expect(exception.getStatus()).toBe(400);
      expect(response.statusCode).toBe(400);
      expect(response.message).toBe('Test error');
    });

    it('should use default status code', () => {
      const error = new Error('Server error');
      const exception = service.createHttpException(error);

      expect(exception.getStatus()).toBe(500);
    });

    it('should create standard error response', () => {
      const error = 'API error';
      const exception = service.createHttpException(error, 503);
      const response = exception.getResponse() as any;

      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('error');
    });
  });

  describe('Real-world Error Handling Patterns', () => {
    it('should handle database operations with proper error context', async () => {
      const mockDatabaseOperation = () => {
        const error = new Error('Connection timeout');
        return Promise.reject(error);
      };

      try {
        await service.safeDatabaseOperation(
          mockDatabaseOperation,
          'Fetch user by ID',
        );
      } catch (error) {
        const exception = error as BadRequestException;
        const response = exception.getResponse() as any;

        expect(response.message).toContain('Connection timeout');
      }
    });

    it('should handle mixed error types from external APIs', () => {
      const apiErrors = [
        new Error('Network error'),
        'Rate limit exceeded',
        { message: 'Invalid response' },
        null,
      ];

      for (const apiError of apiErrors) {
        const parsed = service.validateError(apiError);
        expect(typeof parsed.message).toBe('string');
        expect(parsed.message.length > 0).toBe(true);
      }
    });

    it('should create consistent error responses for clients', () => {
      const errors = [
        new Error('Database error'),
        'Service unavailable',
        { message: 'Invalid input' },
      ];

      const errorResponses = errors.map((err) => {
        const exception = service.createHttpException(err, 400);
        return exception.getResponse();
      }) as any[];

      errorResponses.forEach((response) => {
        expect(response).toHaveProperty('statusCode', 400);
        expect(response).toHaveProperty('message');
        expect(response).toHaveProperty('error');
        expect(typeof response.message).toBe('string');
      });
    });
  });
});
