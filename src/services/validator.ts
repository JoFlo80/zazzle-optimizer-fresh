import { z } from 'zod';
import { logger } from './logger';
import { ContentError, ErrorCodes } from './errorHandler';
import { v4 as uuidv4 } from 'uuid';

// Constants for validation rules
const VALIDATION_RULES = {
  title: {
    maxLength: 50,
    minLength: 1
  },
  description: {
    maxLength: 2000,
    minLength: 150
  },
  tags: {
    min: 4,
    max: 12
  }
} as const;

// Zod schema for content validation
const ContentSchema = z.object({
  title: z.string()
    .min(VALIDATION_RULES.title.minLength, 'Title is required')
    .max(VALIDATION_RULES.title.maxLength, `Title must be ${VALIDATION_RULES.title.maxLength} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Title cannot contain JSON syntax'
    ),
  description: z.string()
    .min(VALIDATION_RULES.description.minLength, `Description must be at least ${VALIDATION_RULES.description.minLength} characters`)
    .max(VALIDATION_RULES.description.maxLength, `Description must be ${VALIDATION_RULES.description.maxLength} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Description cannot contain JSON syntax'
    ),
  tags: z.union([
    z.string(),
    z.array(z.string())
  ]).transform((val) => {
    // Convert string tags to array
    if (typeof val === 'string') {
      return val.split(',').map(tag => tag.trim()).filter(Boolean);
    }
    return val;
  }).refine(
    (tags) => tags.length >= VALIDATION_RULES.tags.min && tags.length <= VALIDATION_RULES.tags.max,
    `Must have between ${VALIDATION_RULES.tags.min} and ${VALIDATION_RULES.tags.max} tags`
  ).refine(
    (tags) => tags.every(tag => tag.trim().length > 0),
    'Tags cannot be empty'
  )
});

export class ContentValidator {
  /**
   * Validates the JSON structure of the input
   */
  static validateJSON(input: string): { isValid: boolean; data?: any; error?: string } {
    const requestId = uuidv4();
    logger.debug('ContentValidator', 'Validating JSON structure', { requestId, input });

    try {
      // Clean and validate basic JSON structure
      const trimmedInput = input.trim();
      if (!trimmedInput.startsWith('{') || !trimmedInput.endsWith('}')) {
        throw new Error('Input must be a JSON object');
      }

      // Parse JSON
      const data = JSON.parse(trimmedInput);
      
      // Validate object type
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Input must be a JSON object');
      }

      // Check required fields
      const requiredFields = ['title', 'description', 'tags'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      logger.debug('ContentValidator', 'JSON structure validation successful', {
        requestId,
        validatedData: data
      });

      return { isValid: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON structure';
      logger.error('ContentValidator', `JSON validation failed: ${message}`, { requestId });
      
      return {
        isValid: false,
        error: `Content generation failed due to invalid JSON structure: ${message}`
      };
    }
  }

  /**
   * Validates the content structure and data types
   */
  static validateContent(content: unknown): { 
    isValid: boolean;
    data?: z.infer<typeof ContentSchema>;
    error?: string;
  } {
    const requestId = uuidv4();
    logger.debug('ContentValidator', 'Validating content', { requestId, content });

    try {
      // Parse content if it's a string
      const data = typeof content === 'string' ? JSON.parse(content) : content;

      // Validate against schema
      const validated = ContentSchema.parse(data);

      logger.debug('ContentValidator', 'Content validation successful', {
        requestId,
        validatedData: validated
      });

      return { isValid: true, data: validated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid content structure';
      logger.error('ContentValidator', `Content validation failed: ${message}`, { requestId });

      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => issue.message).join(', ');
        return {
          isValid: false,
          error: `Content validation failed: ${issues}`
        };
      }

      return {
        isValid: false,
        error: `Content validation failed: ${message}`
      };
    }
  }

  /**
   * Validates and transforms the input content
   */
  static validateAndTransform(input: string): z.infer<typeof ContentSchema> {
    const structureResult = this.validateJSON(input);
    if (!structureResult.isValid) {
      throw new ContentError(
        structureResult.error || 'Invalid JSON structure',
        'INVALID_JSON'
      );
    }

    const contentResult = this.validateContent(structureResult.data);
    if (!contentResult.isValid) {
      throw new ContentError(
        contentResult.error || 'Invalid content structure',
        'VALIDATION_ERROR'
      );
    }

    return contentResult.data;
  }

  /**
   * Creates a detailed error report
   */
  static createErrorReport(error: unknown): string {
    const requestId = uuidv4();
    
    if (error instanceof ContentError) {
      return JSON.stringify({
        error_code: error.code,
        message: error.message,
        request_id: error.context.requestId || requestId,
        timestamp: Date.now(),
        details: error.context
      }, null, 2);
    }

    return JSON.stringify({
      error_code: ErrorCodes.INVALID_JSON,
      message: error instanceof Error ? error.message : 'Invalid JSON structure',
      request_id: requestId,
      timestamp: Date.now()
    }, null, 2);
  }

  /**
   * Validates the model name to prevent unauthorized changes
   */
  static validateModel(model: string): void {
    if (model !== 'gpt-4o') {
      throw new ContentError(
        'Unauthorized model change attempt detected',
        'MODEL_ERROR',
        { attemptedModel: model }
      );
    }
  }

  /**
   * Validates the output content structure
   */
  static validateOutput(content: unknown): { isValid: boolean; error?: string } {
    const requestId = uuidv4();
    logger.debug('ContentValidator', 'Validating output content', { requestId });

    try {
      // First check if content is valid JSON if it's a string
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          return {
            isValid: false,
            error: 'Content validation failed due to invalid JSON structure'
          };
        }
      }

      // Validate against ContentSchema
      ContentSchema.parse(content);
      
      logger.debug('ContentValidator', 'Output validation successful', { requestId });
      return { isValid: true };
    } catch (error) {
      logger.error('ContentValidator', 'Output validation failed', {
        requestId,
        error
      });

      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => issue.message).join(', ');
        return {
          isValid: false,
          error: `Content validation failed: ${issues}`
        };
      }

      return {
        isValid: false,
        error: 'Content validation failed: Invalid content structure'
      };
    }
  }
}

export type ValidatedContent = z.infer<typeof ContentSchema>;