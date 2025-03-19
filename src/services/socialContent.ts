import { analyzeImageAndGenerateContent } from './openai';
import type { ContentTone, GenerateContentParams, SocialContent } from '../types';

const DEFAULT_CONTENT = {
  Instagram: {
    title: "Default Instagram Title",
    description: "This is a detailed and engaging Instagram caption optimized for SEO and designed to capture attention. It provides all necessary context and information.",
    tags: "optimized, instagram, social, seo, design, creative"
  },
  Facebook: {
    title: "Default Facebook Title",
    description: "This is a detailed and engaging Facebook post optimized for SEO, designed to capture attention and provide all necessary information.",
    tags: "optimized, facebook, social, seo, design, creative"
  },
  Pinterest: {
    title: "Default Pin Title",
    description: "This is a detailed and engaging Pinterest pin description optimized for SEO, providing all necessary information to enhance your ranking and attract your audience.",
    tags: "optimized, pinterest, seo, design, creative"
  }
};

const MAX_TITLE_LENGTH = 40;
const MIN_DESCRIPTION_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;

const PLATFORM_PROMPTS = {
  Instagram: `You are an Instagram content expert. Your task is to return ONLY a valid JSON object with exactly three keys. NO other text or formatting is allowed.

CRITICAL: The response MUST be ONLY this exact JSON format:
{
  "title": "SEO-optimized Instagram Title (max 40 characters)",
  "description": "A detailed Instagram caption/description (at least 100 characters and up to 1000 characters) optimized for Instagram and SEO.",
  "tags": "optional, comma-separated tags (if available)"
}`,

  Facebook: `You are a Facebook content expert. Your task is to return ONLY a valid JSON object with exactly three keys. NO other text or formatting is allowed.

CRITICAL: The response MUST be ONLY this exact JSON format:
{
  "title": "SEO-optimized Facebook Title (max 40 characters)",
  "description": "A detailed Facebook post description (at least 100 characters and up to 1000 characters) optimized for Facebook and SEO.",
  "tags": "optional, comma-separated tags (if available)"
}`,

  Pinterest: `You are a Pinterest content expert. Your task is to return ONLY a valid JSON object with exactly three keys. NO other text or formatting is allowed.

CRITICAL: The response MUST be ONLY this exact JSON format:
{
  "title": "SEO-optimized Pin Title (max 40 characters)",
  "description": "A detailed Pinterest pin description (at least 100 characters and up to 1000 characters) optimized for Pinterest and SEO.",
  "tags": "A non-empty, comma-separated string of keywords (without hash symbols)"
}`
};

const COMMON_REQUIREMENTS = `
STRICT REQUIREMENTS:
1. Return ONLY the JSON object - NO explanatory text
2. Response MUST be valid JSON parseable by JSON.parse()
3. Include EXACTLY these three keys: "title", "description", "tags"
4. Title MUST be 40 characters or less
5. Description MUST be between 100-1000 characters
6. Include relevant emojis in description
7. Tags MUST be comma-separated

CRITICAL: Return ONLY the JSON object. The response should start with "{" and end with "}".

Product Focus: {productFocus}
Product Description: {productDescription}
Tone: {tone}

IMPORTANT: Your response must be ONLY the JSON object, with no additional text, markdown, or formatting.`;

function validateContent(content: string, platform: keyof typeof DEFAULT_CONTENT): any {
  console.log(`\n=== Raw ${platform} Content ===`);
  console.log(content);

  // First, clean up the content by removing any non-JSON text
  const cleanedContent = content.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1').trim();
  
  // Check if content starts with '{' and ends with '}'
  if (!cleanedContent.startsWith('{') || !cleanedContent.endsWith('}')) {
    console.error(`${platform} content is not a valid JSON object (missing braces)`);
    return null;
  }

  try {
    // Parse the cleaned JSON content
    const parsed = JSON.parse(cleanedContent);
    console.log(`\n=== Parsed ${platform} JSON ===`);
    console.log(JSON.stringify(parsed, null, 2));

    // Validate required fields
    if (!parsed.title?.trim() || !parsed.description?.trim()) {
      console.error(`Missing required fields for ${platform}`);
      return null;
    }

    // Format and validate fields
    const formatted = {
      title: String(parsed.title).trim(),
      description: String(parsed.description).trim(),
      tags: String(parsed.tags || '').trim()
    };

    // Title validation
    if (formatted.title.length > MAX_TITLE_LENGTH) {
      formatted.title = formatted.title.substring(0, MAX_TITLE_LENGTH - 3) + '...';
    }

    // Description validation
    if (formatted.description.length < MIN_DESCRIPTION_LENGTH) {
      formatted.description = DEFAULT_CONTENT[platform].description;
    } else if (formatted.description.length > MAX_DESCRIPTION_LENGTH) {
      formatted.description = formatted.description.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...';
    }

    // Tags validation
    if (platform === 'Pinterest' && !formatted.tags) {
      formatted.tags = DEFAULT_CONTENT.Pinterest.tags;
    } else if (!formatted.tags) {
      formatted.tags = DEFAULT_CONTENT[platform].tags;
    }

    console.log(`\n=== Validated ${platform} Content ===`);
    console.log(JSON.stringify(formatted, null, 2));

    return formatted;
  } catch (error) {
    console.error(`Failed to parse ${platform} JSON:`, error);
    return null;
  }
}

function formatContent(content: any, platform: keyof typeof DEFAULT_CONTENT): SocialContent {
  if (!content) {
    console.log(`Using default ${platform} content`);
    return {
      description: DEFAULT_CONTENT[platform].description,
      hashtags: DEFAULT_CONTENT[platform].tags
    };
  }

  // Format description with emojis if not present
  let description = content.description;
  if (!description.includes('✨') && !description.includes('🌟')) {
    const cta = platform === 'Pinterest' 
      ? '🔍 Save for inspiration!'
      : platform === 'Facebook'
      ? '🌟 Check it out now!'
      : '✨ Shop now!';
    
    description = `${description}\n\n${cta}`;
  }

  // Format hashtags based on platform
  let hashtags = content.tags;
  if (platform !== 'Pinterest') {
    hashtags = content.tags
      .split(',')
      .map((tag: string) => tag.trim())
      .filter(Boolean)
      .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`)
      .join(' ');
  }

  return {
    description,
    hashtags
  };
}

export async function generateSocialContent({
  platform,
  productFocus,
  productDescription,
  contentType,
  tone
}: GenerateContentParams): Promise<SocialContent> {
  if (!productFocus?.trim()) {
    throw new Error('Product focus is required');
  }

  if (!productDescription?.trim()) {
    throw new Error('Product description is required');
  }

  const validPlatform = platform as keyof typeof DEFAULT_CONTENT;
  if (!DEFAULT_CONTENT[validPlatform]) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  console.log(`\n🚀 Starting ${platform} Content Generation`);
  console.log('Product Focus:', productFocus);
  console.log('Product Description:', productDescription);
  console.log('Content Type:', contentType);
  console.log('Tone:', tone);

  try {
    console.log('\n🤖 Calling OpenAI API...');
    
    const prompt = PLATFORM_PROMPTS[validPlatform] + COMMON_REQUIREMENTS
      .replace('{productFocus}', productFocus)
      .replace('{productDescription}', productDescription)
      .replace('{tone}', tone);

    const response = await analyzeImageAndGenerateContent(
      null,
      productFocus,
      validPlatform,
      prompt
    );

    // Extract and validate JSON from response
    const jsonContent = validateContent(response.description, validPlatform);
    
    // Format content with platform-specific rules
    const formattedContent = formatContent(jsonContent, validPlatform);
    
    console.log(`\n✅ Final Formatted ${platform} Content:`, formattedContent);
    return formattedContent;
  } catch (error) {
    console.error(`\n❌ ${platform} Content Generation Error:`, error);
    return formatContent(null, validPlatform);
  }
}