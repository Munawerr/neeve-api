/**
 * Mongoose document transformation utilities
 */

/**
 * Type for Mongoose document objects
 */
export type MongooseDocument<T = Record<string, unknown>> = {
  _id: string;
  toObject(): T & { _id: string };
  [key: string]: unknown;
};

/**
 * Safely convert Mongoose document to plain object with type safety
 */
export function toObjectSafe<
  T extends Record<string, unknown> = Record<string, unknown>,
>(doc: unknown): (T & { _id: string }) | null {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  // Check if it's a Mongoose document
  if (
    'toObject' in doc &&
    typeof (doc as Record<string, unknown>).toObject === 'function'
  ) {
    try {
      return (doc as MongooseDocument<T>).toObject();
    } catch {
      return null;
    }
  }

  // If already plain object
  if ('_id' in doc) {
    return doc as T & { _id: string };
  }

  return null;
}

/**
 * Safely get ID from Mongoose document (handles both ObjectId and string)
 */
export function getDocumentId(doc: unknown): string | null {
  if (!doc || typeof doc !== 'object') {
    return null;
  }

  const docObj = doc as Record<string, unknown>;

  // Check for _id property
  if (docObj._id) {
    if (typeof docObj._id === 'string') {
      return docObj._id;
    }
    if (typeof docObj._id === 'object' && docObj._id !== null) {
      const idObj = docObj._id as Record<string, unknown>;
      if ('toString' in idObj && typeof idObj.toString === 'function') {
        try {
          const result = (idObj.toString as () => string)();
          // Ensure it's not defaultObject stringification
          if (result && !result.startsWith('[object')) {
            return result;
          }
        } catch {
          // Ignore errors from toString
        }
      }
    }
  }

  // Check for id property
  if (docObj.id && typeof docObj.id === 'string') {
    return docObj.id;
  }

  return null;
}

/**
 * Safely get property from Mongoose document
 */
export function getDocProperty<T = unknown>(
  doc: unknown,
  property: string,
  fallback?: T,
): T | undefined {
  if (!doc || typeof doc !== 'object') {
    return fallback;
  }

  const docObj = doc as Record<string, unknown>;
  const value = docObj[property];

  if (value === null || value === undefined) {
    return fallback;
  }

  return value as T;
}

/**
 * Type-safe array of Mongoose documents
 */
export function toObjectArraySafe<
  T extends Record<string, unknown> = Record<string, unknown>,
>(docs: unknown[]): (T & { _id: string })[] {
  if (!Array.isArray(docs)) {
    return [];
  }

  return docs
    .map((doc) => toObjectSafe<T>(doc))
    .filter((doc): doc is T & { _id: string } => doc !== null);
}
