import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';

// Validation rules
const VALIDATION_RULES = {
  messages: {
    role: ['system', 'user', 'assistant'] as const,
    contentTypes: ['text', 'image_url'] as const
  },
  output: {
    title: {
      maxLength: 50,
      minLength: 1
    },
    description: {
      maxLength: 200,
      minLength: 150
    },
    tags: {
      min: 10,
      max: 12
    }
  }
} as const;

// Message content schema
const MessageContentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().min(1, 'Text content is required')
  }),
  z.object({
    type: z.literal('image_url'),
    image_url: z.object({
      url: z.string().url('Invalid image URL')
    })
  })
]);

// Message schema
const MessageSchema = z.object({
  role: z.enum(VALIDATION_RULES.messages.role),
  content: z.array(MessageContentSchema)
    .min(1, 'Message must have at least one content item')
});

// Messages array schema
const MessagesSchema = z.array(MessageSchema)
  .min(1, 'At least one message is required')
  .refine(
    (messages) => messages.some(msg => msg.role === 'user'),
    'Messages must include at least one user message'
  );

export class Validator {
  static validateMessages(messages: unknown): { isValid: boolean; error?: string } {
    try {
      MessagesSchema.parse(messages);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => issue.message).join(', ');
        return { isValid: false, error: issues };
      }
      return { isValid: false, error: 'Invalid message structure' };
    }
  }

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

      // Basic type check
      if (typeof content !== 'object' || content === null || Array.isArray(content)) {
        return { isValid: false, error: 'Content must be a valid JSON object' };
      }

      // Check required fields
      const requiredFields = ['title', 'description', 'tags'];
      const missingFields = requiredFields.filter(field => !(field in content));
      
      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        };
      }

      // Type and constraint validations
      const { title, description, tags } = content as any;

      if (typeof title !== 'string' || title.length === 0 || title.length > VALIDATION_RULES.output.title.maxLength) {
        return {
          isValid: false,
          error: `Title must be a non-empty string with maximum ${VALIDATION_RULES.output.title.maxLength} characters`
        };
      }

      if (typeof description !== 'string' || 
          description.length < VALIDATION_RULES.output.description.minLength || 
          description.length > VALIDATION_RULES.output.description.maxLength) {
        return {
          isValid: false,
          error: `Description must be between ${VALIDATION_RULES.output.description.minLength} and ${VALIDATION_RULES.output.description.maxLength} characters`
        };
      }

      if (!Array.isArray(tags) || 
          tags.length < VALIDATION_RULES.output.tags.min || 
          tags.length > VALIDATION_RULES.output.tags.max || 
          !tags.every(tag => typeof tag === 'string')) {
        return {
          isValid: false,
          error: `Tags must be an array of ${VALIDATION_RULES.output.tags.min}-${VALIDATION_RULES.output.tags.max} strings`
        };
      }

      logger.debug('Validator', 'Output validation successful', { requestId });
      return { isValid: true };
    } catch (error) {
      logger.error('Validator', 'Output validation failed', {
        requestId,
        error
      });

      return {
        isValid: false,
        error: 'Content validation failed: Invalid content structure'
      };
    }
  }

  static validateModel(model: string): void {
    if (model !== 'gpt-4o') {
      throw new Error('Unauthorized model change attempt detected');
    }
  }
}

export { VALIDATION_RULES };
export type { z };