import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export const ErrorCodes = {
  INVALID_JSON: 'INVALID_JSON',
  MISSING_INPUT: 'MISSING_INPUT',
  IMAGE_ERROR: 'IMAGE_ERROR',
  CONTENT_ERROR: 'CONTENT_ERROR',
  MODEL_ERROR: 'MODEL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  API_ERROR: 'API_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

export interface ErrorContext {
  requestId?: string;
  timestamp?: number;
  originalError?: unknown;
  validationErrors?: string[];
  missingFields?: string[];
  attemptedModel?: string;
  content?: Record<string, unknown>;
  imageFile?: File;
  dimensions?: { width: number; height: number };
}

export class ContentError extends Error {
  code: ErrorCode;
  context: Required<ErrorContext>;

  constructor(
    message: string,
    code: ErrorCode,
    contextData?: ErrorContext
  ) {
    super(message);
    this.name = 'ContentError';
    this.code = code;

    this.context = {
      requestId: contextData?.requestId || uuidv4(),
      timestamp: contextData?.timestamp || Date.now(),
      originalError: contextData?.originalError,
      validationErrors: contextData?.validationErrors || [],
      missingFields: contextData?.missingFields || [],
      attemptedModel: contextData?.attemptedModel || '',
      content: contextData?.content || {},
      imageFile: contextData?.imageFile,
      dimensions: contextData?.dimensions
    };

    logger.error('ContentError', message, {
      code: this.code,
      requestId: this.context.requestId,
      ...contextData
    });
  }

  toJSON() {
    return {
      error_code: this.code,
      message: this.message,
      request_id: this.context.requestId,
      timestamp: this.context.timestamp,
      details: this.context
    };
  }
}

export function handleContentError(error: unknown): never {
  if (error instanceof ContentError) {
    throw error;
  }

  if (error instanceof Error) {
    if (error.message.includes('JSON')) {
      throw new ContentError(
        'Invalid JSON structure detected',
        'INVALID_JSON',
        { originalError: error }
      );
    }

    if (error.message.includes('missing') || error.message.includes('required')) {
      throw new ContentError(
        'Missing required fields in the generated content',
        'MISSING_INPUT',
        { originalError: error }
      );
    }

    if (error.message.includes('image')) {
      throw new ContentError(
        'Failed to process image',
        'IMAGE_ERROR',
        { originalError: error }
      );
    }

    if (error.message.includes('model')) {
      throw new ContentError(
        'Unauthorized model change attempt detected',
        'MODEL_ERROR',
        { originalError: error }
      );
    }

    throw new ContentError(
      error.message,
      'UNKNOWN_ERROR',
      { originalError: error }
    );
  }

  throw new ContentError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    { originalError: error }
  );
}