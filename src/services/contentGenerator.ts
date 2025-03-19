import type { GeneratedContent } from '../types';
import { analyzeImageAndGenerateContent, generateZazzleContent } from './openai';
import { generateInstagramContent, formatInstagramResponse } from './instagramContent';

interface ZazzleContent {
  title: string;
  description: string;
  tags: string;
}

interface SocialContent {
  description: string;
  hashtags: string[];
}

interface PinterestContent {
  title: string;
  description: string;
}

export async function generateZazzleContent(
  productFocus: string,
  imageFile?: File
): Promise<ZazzleContent> {
  if (!productFocus?.trim()) {
    throw new Error('Error: Failed to generate product description');
  }

  try {
    // Use the new plain text content generator
    const content = await generateZazzleContent(productFocus, imageFile);
    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Error: Failed to generate product description');
  }
}

export async function generateSocialContent(
  platform: 'Instagram' | 'Facebook' | 'Pinterest',
  productFocus: string,
  imageFile?: File
): Promise<SocialContent | PinterestContent> {
  if (!productFocus?.trim()) {
    throw new Error(`Error: Failed to generate ${platform} content`);
  }

  try {
    switch (platform) {
      case 'Instagram':
      case 'Facebook': {
        const content = await generateInstagramContent(productFocus, imageFile);
        return {
          description: content.description,
          hashtags: content.hashtags
        };
      }

      case 'Pinterest': {
        const content = await analyzeImageAndGenerateContent(
          imageFile || null,
          productFocus,
          'Pinterest',
          `You are a Pinterest content expert. Generate content in this exact JSON format:

{
  "title": "Create a concise, engaging Pinterest title under 100 characters",
  "description": "Write a compelling Pinterest description under 800 characters"
}

Focus on:
1. SEO optimization
2. Emotional appeal
3. Product benefits
4. Clear call-to-action

CRITICAL: Return ONLY the JSON object with title and description fields.`
        );

        return {
          title: content.title,
          description: content.description
        };
      }

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
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
    throw new Error(`Error: Failed to generate ${platform} content`);
  }
}

export function formatSocialContent(
  content: SocialContent | PinterestContent,
  platform: 'Instagram' | 'Facebook' | 'Pinterest'
): string {
  try {
    if (platform === 'Pinterest') {
      return JSON.stringify(content as PinterestContent, null, 2);
    }
    return JSON.stringify(content as SocialContent, null, 2);
  } catch (error) {
    throw new Error(`Error: Failed to format ${platform} content`);
  }
}