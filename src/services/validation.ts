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
    maxLength: 200,
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

export const Validator = class {
  static validateJSON(input: string): { isValid: boolean; data?: any; error?: string } {
    const requestId = uuidv4();
    logger.debug('Validator', 'Validating JSON structure', { requestId, input });

    try {
      const trimmedInput = input.trim();
      if (!trimmedInput.startsWith('{') || !trimmedInput.endsWith('}')) {
        throw new Error('Input must be a JSON object');
      }

      const data = JSON.parse(trimmedInput);
      
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Input must be a JSON object');
      }

      const requiredFields = ['title', 'description', 'tags'];
      const missingFields = requiredFields.filter(field => !(field in data));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      logger.debug('Validator', 'JSON structure validation successful', {
        requestId,
        validatedData: data
      });

      return { isValid: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON structure';
      logger.error('Validator', `JSON validation failed: ${message}`, { requestId });
      
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
    logger.debug('Validator', 'Validating content', { requestId, content });

    try {
      // Parse content if it's a string
      const data = typeof content === 'string' ? JSON.parse(content) : content;

      // Validate against schema
      const validated = ContentSchema.parse(data);

      logger.debug('Validator', 'Content validation successful', {
        requestId,
        validatedData: validated
      });

      return { isValid: true, data: validated };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid content structure';
      logger.error('Validator', `Content validation failed: ${message}`, { requestId });

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

  static validateModel(model: string): void {
    if (model !== 'gpt-4o') {
      throw new ContentError(
        'Unauthorized model change attempt detected',
        'MODEL_ERROR',
        { attemptedModel: model }
      );
    }
  }

  static validateOutput(content: unknown): { isValid: boolean; error?: string } {
    const requestId = uuidv4();
    logger.debug('Validator', 'Validating output content', { requestId });

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
      
      logger.debug('Validator', 'Output validation successful', { requestId });
      return { isValid: true };
    } catch (error) {
      logger.error('Validator', 'Output validation failed', {
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

  static validateMessages(messages: any[]): { isValid: boolean; error?: string } {
    const requestId = uuidv4();
    logger.debug('Validator', 'Validating messages structure', { requestId });

    if (!Array.isArray(messages) || messages.length === 0) {
      logger.error('Validator', 'Messages array is empty or invalid', { requestId });
      return { isValid: false, error: 'Messages array is empty or invalid.' };
    }

    for (const message of messages) {
      if (!message.role || !['system', 'user', 'assistant'].includes(message.role)) {
        logger.error('Validator', 'Invalid message role', { requestId, role: message.role });
        return { isValid: false, error: 'Each message must have a valid role.' };
      }

      if (!message.content || !Array.isArray(message.content)) {
        logger.error('Validator', 'Invalid message content', { requestId });
        return { isValid: false, error: 'Each message must have a valid content array.' };
      }

      for (const item of message.content) {
        if (item.type === 'text' && typeof item.text !== 'string') {
          logger.error('Validator', 'Invalid text content', { requestId });
          return { isValid: false, error: 'Text type content must have a string text field.' };
        }
        if (item.type === 'image_url' && (!item.image_url || typeof item.image_url.url !== 'string')) {
          logger.error('Validator', 'Invalid image URL content', { requestId });
          return { isValid: false, error: 'Image URL type content must have a valid url.' };
        }
      }
    }

    logger.debug('Validator', 'Message validation successful', { requestId });
    return { isValid: true };
  }
};

export type ValidatedContent = z.infer<typeof ContentSchema>;