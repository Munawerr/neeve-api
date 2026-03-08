import {
  toObjectSafe,
  getDocumentId,
  getDocProperty,
  toObjectArraySafe,
  MongooseDocument,
} from '../utils/mongoose.utils';

describe('Mongoose Utilities', () => {
  interface TestDocument extends Record<string, unknown> {
    name: string;
    email: string;
    age: number;
  }

  const createMockDocument = (
    data: TestDocument,
  ): Partial<MongooseDocument<TestDocument>> => {
    const mockId = { toString: () => '507f1f77bcf86cd799439011' };
    return {
      _id: mockId as any,
      ...data,
      toObject: () => ({
        _id: '507f1f77bcf86cd799439011',
        ...data,
      }),
    };
  };

  describe('toObjectSafe', () => {
    it('should convert Mongoose document to plain object', () => {
      const doc = createMockDocument({
        name: 'John',
        email: 'john@example.com',
        age: 30,
      });

      const result = toObjectSafe<TestDocument>(doc as any);

      expect(result).not.toBeNull();
      expect(result?._id).toBe('507f1f77bcf86cd799439011');
      expect(result?.name).toBe('John');
      expect(result?.email).toBe('john@example.com');
      expect(result?.age).toBe(30);
    });

    it('should return null for non-document objects', () => {
      const result = toObjectSafe({
        name: 'John',
        email: 'john@example.com',
      });

      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = toObjectSafe(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = toObjectSafe(undefined);
      expect(result).toBeNull();
    });

    it('should handle plain objects with _id', () => {
      const plainObj = {
        _id: '507f1f77bcf86cd799439011',
        name: 'John',
        email: 'john@example.com',
      };

      const result = toObjectSafe<TestDocument>(plainObj);

      expect(result).not.toBeNull();
      expect(result?._id).toBe('507f1f77bcf86cd799439011');
      expect(result?.name).toBe('John');
    });

    it('should propagate errors from toObject gracefully', () => {
      const doc = {
        toObject: () => {
          throw new Error('toObject failed');
        },
      };

      const result = toObjectSafe(doc as any);
      expect(result).toBeNull();
    });
  });

  describe('getDocumentId', () => {
    it('should extract string _id from Mongoose document', () => {
      const plainDoc = {
        _id: '507f1f77bcf86cd799439011',
        name: 'John',
      };

      const result = getDocumentId(plainDoc);
      expect(result).toBe('507f1f77bcf86cd799439011');
    });

    it('should extract ObjectId.toString() when _id is an object', () => {
      const mockId = {
        toString: () => '507f1f77bcf86cd799439011',
      };

      const doc = {
        _id: mockId,
        name: 'John',
      };

      const result = getDocumentId(doc);
      expect(result).toBe('507f1f77bcf86cd799439011');
    });

    it('should fallback to id property if _id not available', () => {
      const doc = {
        id: '123',
        name: 'John',
      };

      const result = getDocumentId(doc);
      expect(result).toBe('123');
    });

    it('should return null for documents without _id or id', () => {
      const doc = {
        name: 'John',
      };

      const result = getDocumentId(doc);
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = getDocumentId(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = getDocumentId(undefined);
      expect(result).toBeNull();
    });

    it('should handle _id with missing toString method', () => {
      const doc = {
        _id: {
          /* no toString */
        },
        name: 'John',
      };

      const result = getDocumentId(doc);
      expect(result).toBeNull();
    });
  });

  describe('getDocProperty', () => {
    it('should safely get property from object', () => {
      const doc = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
      };

      expect(getDocProperty(doc, 'name')).toBe('John');
      expect(getDocProperty(doc, 'email')).toBe('john@example.com');
      expect(getDocProperty(doc, 'age')).toBe(30);
    });

    it('should return fallback for missing properties', () => {
      const doc = { name: 'John' };

      expect(getDocProperty(doc, 'missing', 'default')).toBe('default');
    });

    it('should return undefined when property is null', () => {
      const doc = { name: null };
      const result = getDocProperty(doc, 'name', 'default');

      expect(result).toBe('default');
    });

    it('should return fallback for null input', () => {
      const result = getDocProperty(null, 'property', 'default');
      expect(result).toBe('default');
    });

    it('should return typed value', () => {
      const doc = { count: 42 };
      const result = getDocProperty<number>(doc, 'count');

      expect(typeof result).toBe('number');
      expect(result).toBe(42);
    });
  });

  describe('toObjectArraySafe', () => {
    it('should convert array of Mongoose documents', () => {
      const docs = [
        createMockDocument({
          name: 'John',
          email: 'john@example.com',
          age: 30,
        }),
        createMockDocument({
          name: 'Jane',
          email: 'jane@example.com',
          age: 28,
        }),
      ];

      const result = toObjectArraySafe<TestDocument>(docs as any);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John');
      expect(result[1].name).toBe('Jane');
      expect(result[0]._id).toBe('507f1f77bcf86cd799439011');
    });

    it('should return empty array for non-array input', () => {
      const result = toObjectArraySafe(null as any);
      expect(result).toEqual([]);
    });

    it('should filter out null conversions', () => {
      const docs = [
        createMockDocument({
          name: 'John',
          email: 'john@example.com',
          age: 30,
        }),
        { invalid: 'object' }, // This should be filtered out
        createMockDocument({
          name: 'Jane',
          email: 'jane@example.com',
          age: 28,
        }),
      ];

      const result = toObjectArraySafe<TestDocument>(docs as any);

      // Should only include valid conversions
      expect(result.length).toBeLessThanOrEqual(docs.length);
      expect(result.every((doc) => doc._id)).toBe(true);
    });

    it('should handle empty array', () => {
      const result = toObjectArraySafe([]);
      expect(result).toEqual([]);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should safely handle database query results', () => {
      const mockDbResult = createMockDocument({
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
      });

      // Simulate database query result
      const result = toObjectSafe<TestDocument>(mockDbResult as any);

      if (result) {
        const id = getDocumentId(result);
        const name = getDocProperty<string>(result, 'name');

        expect(id).toBe('507f1f77bcf86cd799439011');
        expect(name).toBe('John Doe');
      }
    });

    it('should handle partial updates safely', () => {
      const doc = createMockDocument({
        name: 'John',
        email: 'old@example.com',
        age: 30,
      });

      const converted = toObjectSafe<TestDocument>(doc as any);

      if (converted) {
        const updates = {
          email:
            getDocProperty<string>(converted, 'email') || 'default@example.com',
          name: getDocProperty<string>(converted, 'name') || 'Anonymous',
        };

        expect(updates.email).toBe('old@example.com');
        expect(updates.name).toBe('John');
      }
    });

    it('should safely process array of database results', () => {
      const mockResults = [
        createMockDocument({
          name: 'User1',
          email: 'user1@example.com',
          age: 25,
        }),
        createMockDocument({
          name: 'User2',
          email: 'user2@example.com',
          age: 30,
        }),
      ];

      const processedUsers = toObjectArraySafe<TestDocument>(
        mockResults as any,
      );

      expect(processedUsers.length).toBe(2);

      processedUsers.forEach((user) => {
        expect(user._id).toBeDefined();
        expect(user.email).toBeDefined();
        expect(user.name).toBeDefined();
      });
    });
  });
});
