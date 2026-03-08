import {
  parseError,
  safeAccess,
  isObject,
  isString,
  isNumber,
  isArray,
} from '../types/index';

describe('Common Type Utilities', () => {
  describe('parseError', () => {
    it('should parse Error instances correctly', () => {
      const error = new Error('Test error');
      const parsed = parseError(error);

      expect(parsed.message).toBe('Test error');
      expect(parsed.originalError).toBe(error);
    });

    it('should parse string errors', () => {
      const error = 'Simple error string';
      const parsed = parseError(error);

      expect(parsed.message).toBe('Simple error string');
    });

    it('should parse object-like errors with message property', () => {
      const error = { message: 'Object error', code: 500 };
      const parsed = parseError(error);

      expect(parsed.message).toBe('Object error');
      expect(parsed.originalError).toBe(error);
    });

    it('should handle unknown error types', () => {
      const parsed = parseError(null);

      expect(parsed.message).toBe('An unknown error occurred');
      expect(parsed.originalError).toBeNull();
    });

    it('should handle undefined errors', () => {
      const parsed = parseError(undefined);

      expect(parsed.message).toBe('An unknown error occurred');
      expect(parsed.originalError).toBeUndefined();
    });

    it('should handle object errors without message', () => {
      const error = { code: 500, details: 'Error details' };
      const parsed = parseError(error);

      expect(parsed.message).toBe('An unknown error occurred');
      expect(parsed.originalError).toBe(error);
    });
  });

  describe('safeAccess', () => {
    const testObj = {
      user: {
        profile: {
          name: 'John Doe',
        },
      },
      status: 'active',
    };

    it('should access single level property', () => {
      const result = safeAccess(testObj, 'status');
      expect(result).toBe('active');
    });

    it('should access nested properties with string key', () => {
      const result = safeAccess(testObj, ['user', 'profile', 'name']);
      expect(result).toBe('John Doe');
    });

    it('should return fallback for non-existent property', () => {
      const result = safeAccess(testObj, 'nonexistent', 'default');
      expect(result).toBe('default');
    });

    it('should return undefined when fallback not provided', () => {
      const result = safeAccess(testObj, 'nonexistent');
      expect(result).toBeUndefined();
    });

    it('should handle null values gracefully', () => {
      const result = safeAccess(testObj, 'nullProperty', 'default');
      expect(result).toBe('default');
    });

    it('should handle non-object inputs', () => {
      const result = safeAccess(null, 'property', 'default');
      expect(result).toBe('default');

      const result2 = safeAccess(undefined, 'property', 'fallback');
      expect(result2).toBe('fallback');
    });

    it('should return typed value', () => {
      const result = safeAccess<string>(testObj, 'status');
      expect(typeof result).toBe('string');
    });
  });

  describe('Type Guards', () => {
    it('isObject should identify objects correctly', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject(undefined)).toBe(false);
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
    });

    it('isString should identify strings correctly', () => {
      expect(isString('test')).toBe(true);
      expect(isString('')).toBe(true);
      expect(isString(123)).toBe(false);
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
    });

    it('isNumber should identify numbers correctly', () => {
      expect(isNumber(123)).toBe(true);
      expect(isNumber(0)).toBe(true);
      expect(isNumber(-123)).toBe(true);
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber('123')).toBe(false);
      expect(isNumber(null)).toBe(false);
    });

    it('isArray should identify arrays correctly', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
      expect(isArray('array')).toBe(false);
      expect(isArray({ 0: 'a', length: 1 })).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('Real-world Usage', () => {
    it('should handle error objects from try-catch correctly', () => {
      try {
        throw new Error('Database connection failed');
      } catch (error) {
        const parsed = parseError(error);
        expect(parsed.message).toContain('Database connection');
      }
    });

    it('should safely navigate API response objects', () => {
      const apiResponse = {
        success: true,
        data: {
          user: {
            id: '123',
            profile: {
              email: 'user@example.com',
            },
          },
        },
      };

      const email = safeAccess(apiResponse, [
        'data',
        'user',
        'profile',
        'email',
      ]);
      expect(email).toBe('user@example.com');

      const missing = safeAccess(
        apiResponse,
        ['data', 'user', 'permissions'],
        [],
      );
      expect(missing).toEqual([]);
    });

    it('should validate and transform untrusted data', () => {
      const untrustedData: unknown = {
        id: '123',
        name: 'John',
        age: 30,
      };

      if (isObject(untrustedData)) {
        const id = safeAccess<string>(untrustedData, 'id');
        const age = safeAccess<number>(untrustedData, 'age');

        expect(isString(id)).toBe(true);
        expect(isNumber(age)).toBe(true);
      }
    });
  });
});
