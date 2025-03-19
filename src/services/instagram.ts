import { resizeImage } from '../utils/imageResizer';
import type { GeneratedContent } from '../types';

export const INSTAGRAM_CONSTRAINTS = {
  image: {
    width: 1080,
    height: 1080,
    maxSize: 8 * 1024 * 1024, // 8MB
    formats: ['image/jpeg', 'image/png', 'image/webp']
  },
  content: {
    maxDescriptionLength: 150,
    minHashtags: 10,
    maxHashtags: 15
  }
} as const;

export interface InstagramContent extends GeneratedContent {
  imageUrl?: string;
}

export async function processInstagramImage(file: File): Promise<Blob> {
  if (!INSTAGRAM_CONSTRAINTS.image.formats.includes(file.type)) {
    throw new Error(`Unsupported format. Please use: ${INSTAGRAM_CONSTRAINTS.image.formats.join(', ')}`);
  }

  if (file.size > INSTAGRAM_CONSTRAINTS.image.maxSize) {
    throw new Error(`Image too large. Maximum size is ${INSTAGRAM_CONSTRAINTS.image.maxSize / (1024 * 1024)}MB`);
  }

  try {
    return await resizeImage(file, {
      width: INSTAGRAM_CONSTRAINTS.image.width,
      height: INSTAGRAM_CONSTRAINTS.image.height
    });
  } catch (error) {
    throw new Error('Failed to process image for Instagram. Please try another image.');
  }
}

export function validateInstagramContent(content: GeneratedContent): GeneratedContent {
  let { description, tags } = content;

  // Trim description to Instagram's limit
  if (description.length > INSTAGRAM_CONSTRAINTS.content.maxDescriptionLength) {
    description = description.substring(0, INSTAGRAM_CONSTRAINTS.content.maxDescriptionLength - 3) + '...';
  }

  // Ensure emotional appeal and CTA
  if (!description.toLowerCase().includes('special') && 
      !description.toLowerCase().includes('unique')) {
    description = description.trim() + '\n\nMake it special! ✨';
  }

  if (!description.toLowerCase().includes('order now')) {
    description = description.trim() + '\n\nOrder now for a personal touch! 🎨';
  }

  // Process hashtags
  const hashtagList = tags.split(/[,\s]+/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

  // Ensure hashtag count is within limits
  if (hashtagList.length < INSTAGRAM_CONSTRAINTS.content.minHashtags) {
    throw new Error(`Not enough hashtags. Minimum required: ${INSTAGRAM_CONSTRAINTS.content.minHashtags}`);
  }

  if (hashtagList.length > INSTAGRAM_CONSTRAINTS.content.maxHashtags) {
    hashtagList.length = INSTAGRAM_CONSTRAINTS.content.maxHashtags;
  }

  return {
    ...content,
    description,
    tags: hashtagList.join(' ')
  };
}

export function enhanceInstagramDescription(description: string): string {
  const sections = description.split('\n\n');
  let enhanced = description;

  // Add product highlight if missing
  if (!enhanced.toLowerCase().includes('features') && !enhanced.toLowerCase().includes('highlights')) {
    enhanced += '\n\n✨ Highlights:\n• Premium quality\n• Personalized design\n• Perfect gift';
  }

  // Add emotional appeal if missing
  if (!enhanced.toLowerCase().includes('special') && !enhanced.toLowerCase().includes('unique')) {
    enhanced += '\n\nCreate something truly special! ✨';
  }

  // Add CTA if missing
  if (!enhanced.toLowerCase().includes('order now')) {
    enhanced += '\n\nOrder now for a personal touch! 🎨';
  }

  return enhanced;
}