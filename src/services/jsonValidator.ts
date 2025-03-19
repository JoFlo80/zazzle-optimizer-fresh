import { z } from 'zod';
import { logger } from './logger';
import { ContentError, ErrorCodes } from './errorHandler';
import { v4 as uuidv4 } from 'uuid';

const ContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(50, 'Title must be 50 characters or less')
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Title cannot contain JSON syntax'
    ),
  description: z.string()
    .min(150, 'Description must be at least 150 characters')
    .max(2000, 'Description must be 2000 characters or less')
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Description cannot contain JSON syntax'
    ),
  tags: z.array(z.string())
    .min(4, 'At least 4 tags are required')
    .max(12, 'Maximum 12 tags allowed')
    .refine(
      (tags) => tags.every(tag => tag.trim().length > 0),
      'Tags cannot be empty'
    )
});

export class JSONValidator {
  static validateStructure(input: string): { isValid: boolean; data?: any; error?: string } {
    const requestId = uuidv4();
    logger.debug('JSONValidator', 'Validating JSON structure', { requestId, input });

    try {
      // Trim whitespace and validate basic JSON structure
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

      // Convert tags to array if it's a string
      if (typeof data.tags === 'string') {
        data.tags = data.tags
          .split(',')
          .map((tag: string) => tag.trim())
          .filter(Boolean);
      }

      // Validate against schema
      ContentSchema.parse(data);

      logger.debug('JSONValidator', 'JSON validation successful', {
        requestId,
        validatedData: data
      });

      return { isValid: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON structure';
      logger.error('JSONValidator', `JSON validation failed: ${message}`, { requestId });
      
      return {
        isValid: false,
        error: `Content generation failed due to invalid JSON structure: ${message}`
      };
    }
  }

  static validateContent(content: unknown): { 
    isValid: boolean;
    data?: z.infer<typeof ContentSchema>;
    error?: string;
  } {
    const requestId = uuidv4();
    logger.debug('JSONValidator', 'Validating content', { requestId, content });

    try {
      // If content is a string, try to parse it
      const data = typeof content === 'string' ? JSON.parse(content) : content;

      // Validate against schema
      const validated = ContentSchema.parse(data);

      logger.debug('JSONValidator', 'Content validation successful', {
        requestId,
        validatedData: validated
      });

      return { isValid: true, data: validated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid content structure';
      logger.error('JSONValidator', `Content validation failed: ${message}`, { requestId });

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

  static validateAndTransform(input: string): z.infer<typeof ContentSchema> {
    const structureResult = this.validateStructure(input);
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
}