import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export const ErrorCodes = {
  CONTENT_ERROR: 'CONTENT_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_INPUT: 'MISSING_INPUT',
  INVALID_JSON: 'INVALID_JSON',
  API_ERROR: 'API_ERROR',
  IMAGE_ERROR: 'IMAGE_ERROR',
  OPTIMIZATION_ERROR: 'OPTIMIZATION_ERROR'
} as const;

export interface ErrorContext {
  requestId: string;
  timestamp: number;
  originalError?: unknown;
  inputData?: Record<string, unknown>;
  validationErrors?: string[];
  missingFields?: string[];
}

export class ContentGenerationError extends Error {
  code: string;
  context: ErrorContext;

  constructor(message: string, code: keyof typeof ErrorCodes, contextData?: Partial<ErrorContext>) {
    super(message);
    this.name = 'ContentGenerationError';
    this.code = ErrorCodes[code];
    
    this.context = {
      requestId: contextData?.requestId || uuidv4(),
      timestamp: Date.now(),
      ...contextData
    };

    // Log the error
    logger.error('ContentGeneration', message, {
      code: this.code,
      ...this.context
    });
  }

  toJSON() {
    return {
      error_code: this.code,
      message: this.message,
      request_id: this.context.requestId,
      timestamp: this.context.timestamp,
      context: {
        validationErrors: this.context.validationErrors,
        missingFields: this.context.missingFields
      }
    };
  }
}

export function handleContentError(error: unknown): never {
  if (error instanceof ContentGenerationError) {
    throw error;
  }

  if (error instanceof Error) {
    // Determine error type and create appropriate ContentGenerationError
    if (error.message.includes('JSON')) {
      throw new ContentGenerationError(
        'Content generation failed. Please check the input for completeness and accuracy.',
        'INVALID_JSON'
      );
    }

    if (error.message.includes('missing') || error.message.includes('required')) {
      throw new ContentGenerationError(
        'Missing required input data for content generation. Please provide all necessary details and retry.',
        'MISSING_INPUT'
      );
    }

    if (error.message.includes('optimization')) {
      throw new ContentGenerationError(
        'Warning: Unauthorized optimization attempt detected.',
        'OPTIMIZATION_ERROR'
      );
    }

    throw new ContentGenerationError(
      error.message,
      'CONTENT_ERROR'
    );
  }

  // Generic error
  throw new ContentGenerationError(
    'Content generation failed. Please check the input and retry.',
    'CONTENT_ERROR'
  );
}

export function validateRequiredInputs(
  productFocus?: string,
  imageFile?: File | null,
  platform?: string
): void {
  const missingFields: string[] = [];

  if (!productFocus?.trim()) {
    missingFields.push('productFocus');
  }

  if (platform && !platform.trim()) {
    missingFields.push('platform');
  }

  if (missingFields.length > 0) {
    throw new ContentGenerationError(
      'Missing required input data for content generation. Please provide all necessary details and retry.',
      'MISSING_INPUT',
      { missingFields }
    );
  }
}

export function createErrorReport(error: unknown): string {
  if (error instanceof ContentGenerationError) {
    return JSON.stringify(error.toJSON(), null, 2);
  }

  return JSON.stringify({
    error_code: ErrorCodes.CONTENT_ERROR,
    message: error instanceof Error ? error.message : 'Unknown error',
    request_id: uuidv4(),
    timestamp: Date.now()
  }, null, 2);
}