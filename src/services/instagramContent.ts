import type { GeneratedContent } from '../types';
import { analyzeImageAndGenerateContent } from './openai';

interface InstagramContentResponse {
  description: string;
  hashtags: string[];
}

const INSTAGRAM_CONSTRAINTS = {
  description: {
    maxLength: 150,
    requiredElements: {
      emotional: ['special', 'unique', 'perfect', 'memorable'],
      personalization: ['personalize', 'custom', 'your'],
      benefits: ['quality', 'premium', 'exclusive'],
      cta: ['order now', 'shop now', 'get yours']
    }
  },
  hashtags: {
    min: 10,
    max: 15,
    categories: {
      easter: ['easter', 'spring', 'holiday'],
      product: ['gift', 'decor', 'design'],
      personalization: ['custom', 'personalized', 'unique'],
      style: ['handmade', 'premium', 'quality']
    }
  }
} as const;

function validateDescription(description: string): string {
  if (!description) {
    throw new Error('Error: Description is required');
  }

  let validatedDescription = description.trim();

  // Truncate if too long
  if (validatedDescription.length > INSTAGRAM_CONSTRAINTS.description.maxLength) {
    validatedDescription = validatedDescription.substring(0, INSTAGRAM_CONSTRAINTS.description.maxLength - 3) + '...';
  }

  // Check for required elements
  const hasEmotional = INSTAGRAM_CONSTRAINTS.description.requiredElements.emotional
    .some(word => validatedDescription.toLowerCase().includes(word));
  const hasPersonalization = INSTAGRAM_CONSTRAINTS.description.requiredElements.personalization
    .some(word => validatedDescription.toLowerCase().includes(word));
  const hasBenefits = INSTAGRAM_CONSTRAINTS.description.requiredElements.benefits
    .some(word => validatedDescription.toLowerCase().includes(word));
  const hasCTA = INSTAGRAM_CONSTRAINTS.description.requiredElements.cta
    .some(phrase => validatedDescription.toLowerCase().includes(phrase));

  // Add missing elements
  if (!hasEmotional || !hasPersonalization) {
    validatedDescription += ' Make your space special with a personalized touch! ✨';
  }
  if (!hasBenefits) {
    validatedDescription += ' Premium quality guaranteed. 🌟';
  }
  if (!hasCTA) {
    validatedDescription += ' Order now! 🎨';
  }

  // Add emojis if missing
  if (!validatedDescription.includes('✨') && !validatedDescription.includes('🌟')) {
    validatedDescription = '✨ ' + validatedDescription;
  }

  return validatedDescription;
}

function validateHashtags(tags: string[]): string[] {
  if (!tags || !Array.isArray(tags)) {
    throw new Error('Error: Hashtags must be an array');
  }

  // Clean and format hashtags
  const cleanedTags = tags
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

  // Validate count
  if (cleanedTags.length < INSTAGRAM_CONSTRAINTS.hashtags.min) {
    throw new Error(`Error: Minimum ${INSTAGRAM_CONSTRAINTS.hashtags.min} hashtags required`);
  }

  // Ensure required categories are represented
  const lowerTags = cleanedTags.map(tag => tag.toLowerCase());
  const missingCategories = Object.entries(INSTAGRAM_CONSTRAINTS.hashtags.categories)
    .filter(([_, keywords]) => !keywords.some(word => 
      lowerTags.some(tag => tag.includes(word))
    ))
    .map(([category]) => category);

  if (missingCategories.length > 0) {
    throw new Error(`Error: Missing hashtags for categories: ${missingCategories.join(', ')}`);
  }

  // Trim to maximum if needed
  if (cleanedTags.length > INSTAGRAM_CONSTRAINTS.hashtags.max) {
    cleanedTags.length = INSTAGRAM_CONSTRAINTS.hashtags.max;
  }

  return cleanedTags;
}

export async function generateInstagramContent(
  productFocus: string,
  imageFile?: File
): Promise<InstagramContentResponse> {
  if (!productFocus?.trim()) {
    throw new Error('Error: Product focus is required');
  }

  try {
    const content = await analyzeImageAndGenerateContent(
      imageFile || null,
      productFocus,
      'Instagram',
      `You are an Instagram content expert. Generate engaging content that follows these STRICT requirements:

1. Description must be under 150 characters
2. Include emotional appeal and personalization
3. Highlight product benefits
4. Add a clear call-to-action
5. Use emojis strategically

Return ONLY a valid JSON object in this exact format:
{
  "description": "Your Instagram description here (max 150 chars)",
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3"]
}

The hashtags array MUST include 10-15 relevant tags covering these categories:
- Easter/Holiday specific
- Product type
- Personalization
- Style/Quality

CRITICAL: Response must be valid JSON and include both fields.`
    );

    // Validate and format the content
    const validatedDescription = validateDescription(content.description);
    const validatedHashtags = validateHashtags(content.tags.split(/[,\s]+/));

    return {
      description: validatedDescription,
      hashtags: validatedHashtags
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('JSON')) {
        throw new Error('Error: Generated content is not a valid JSON object');
      }
      if (error.message.includes('image')) {
        throw new Error('Error: Unable to process image. Please check the file format or size');
      }
      if (error.message.includes('optimization')) {
        throw new Error('Warning: Unauthorized optimization attempt detected');
      }
      throw error;
    }
    throw new Error('Error: Instagram content generation failed');
  }
}

export function formatInstagramResponse(content: InstagramContentResponse): string {
  try {
    return JSON.stringify({
      description: content.description,
      hashtags: content.hashtags
    }, null, 2);
  } catch (error) {
    throw new Error('Error: Failed to format Instagram content response');
  }
}