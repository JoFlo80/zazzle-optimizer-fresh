import { z } from 'zod';
import { logger } from './logger';
import { ContentGenerationError } from './contentError';

const MAX_TITLE_LENGTH = 50;
const MIN_DESCRIPTION_LENGTH = 150;
const MAX_DESCRIPTION_LENGTH = 200;
const MIN_TAGS = 10;
const MAX_TAGS = 12;

const ContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(MAX_TITLE_LENGTH, `Title must be ${MAX_TITLE_LENGTH} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Title cannot contain JSON syntax'
    ),
  description: z.string()
    .min(MIN_DESCRIPTION_LENGTH, `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`)
    .max(MAX_DESCRIPTION_LENGTH, `Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Description cannot contain JSON syntax'
    ),
  tags: z.string()
    .min(1, 'Tags are required')
    .refine(
      (val) => {
        const tagCount = val.split(',').filter(Boolean).length;
        return tagCount >= MIN_TAGS && tagCount <= MAX_TAGS;
      },
      `Must have between ${MIN_TAGS} and ${MAX_TAGS} tags`
    )
});

export class ContentValidator {
  static validateJSON(input: string): { isValid: boolean; data?: any; error?: string } {
    logger.debug('ContentValidator', 'Validating JSON', { input });

    try {
      const trimmedInput = input.trim();
      if (!trimmedInput.startsWith('{') || !trimmedInput.endsWith('}')) {
        throw new Error('Input must be a JSON object');
      }

      const data = JSON.parse(trimmedInput);
      
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Input must be a JSON object');
      }

      return { isValid: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON structure';
      logger.error('ContentValidator', `JSON validation failed: ${message}`);
      
      return {
        isValid: false,
        error: 'Content generation failed due to invalid JSON structure'
      };
    }
  }

  static validateContent(content: string): z.infer<typeof ContentSchema> {
    logger.debug('ContentValidator', 'Validating content structure', { content });

    // First validate JSON structure
    const jsonResult = this.validateJSON(content);
    if (!jsonResult.isValid) {
      throw new ContentGenerationError(
        'Invalid content detected. Please review the input and retry.',
        'VALIDATION_ERROR'
      );
    }

    try {
      // Validate against schema
      const validated = ContentSchema.parse(jsonResult.data);

      // Additional validation for field presence
      const missingFields = [];
      if (!validated.title?.trim()) missingFields.push('title');
      if (!validated.description?.trim()) missingFields.push('description');
      if (!validated.tags?.trim()) missingFields.push('tags');

      if (missingFields.length > 0) {
        throw new ContentGenerationError(
          'Missing required fields in generated content',
          'VALIDATION_ERROR',
          { missingFields }
        );
      }

      logger.debug('ContentValidator', 'Content validation successful', {
        validated
      });

      return validated;
    } catch (error) {
      if (error instanceof ContentGenerationError) throw error;

      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => issue.message);
        throw new ContentGenerationError(
          'Content validation failed',
          'VALIDATION_ERROR',
          { validationErrors: issues }
        );
      }

      throw new ContentGenerationError(
        'Failed to validate content structure',
        'VALIDATION_ERROR'
      );
    }
  }

  static validateModel(model: string): void {
    if (model !== 'gpt-4o') {
      throw new ContentGenerationError(
        'Warning: Unauthorized attempt to modify model or content structure.',
        'OPTIMIZATION_ERROR',
        { attemptedModel: model }
      );
    }
  }
}