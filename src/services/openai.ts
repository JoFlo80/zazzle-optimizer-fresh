import { logger } from './logger';
import type { GeneratedContent } from '../types';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function analyzeImageAndGenerateContent(
  imageFile: File | null,
  productFocus: string,
  productCategory: string,
  customPrompt?: string
): Promise<GeneratedContent> {
  const requestId = crypto.randomUUID();

  logger.debug('OpenAI', 'Starting direct fetch content generation', {
    requestId,
    hasImage: !!imageFile,
    productFocus,
    productCategory
  });

  try {
    if (!productFocus?.trim() || !productCategory?.trim()) {
      throw new Error('Product focus and category are required');
    }

    let imageContent: Array<{ type: string; image_url?: { url: string } }> = [];
    if (imageFile) {
      const base64Image = await convertFileToBase64(imageFile);
      if (!base64Image) {
        throw new Error('Failed to process image');
      }
      imageContent.push({
        type: 'image_url',
        image_url: { url: `data:${imageFile.type};base64,${base64Image}` }
      });
    }

    const messages = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: `You are a Zazzle content expert. Follow these instructions:
- Write a clear, SEO-friendly title (max 50 characters).
- Provide a natural, emotional product description (5-6 sentences).
- Include visual details, personalization options, uses, and benefits.
- Return ONLY JSON with title, description, and tags.
- Tags: minimum 10 long-tail keywords (2-5 words each).`
          }
        ]
      },
      {
        role: 'user',
        content: [
          ...imageContent,
          {
            type: 'text',
            text: customPrompt || `Generate optimized content for this ${productCategory}. Product focus: ${productFocus}.`
          }
        ]
      }
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI', 'API request failed', { requestId, errorText });
      throw new Error(`API request failed: ${errorText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from API');
    }

    const parsed = JSON.parse(content);

    if (!parsed.title || !parsed.description || !parsed.tags) {
      throw new Error('Incomplete content structure received');
    }

    if (parsed.title.length > 50) {
      parsed.title = parsed.title.substring(0, 47) + '...';
    }

    const tags = parsed.tags.split(',')
      .map((tag: string) => tag.trim())
      .filter((tag: string) => {
        const words = tag.split(/\s+/);
        return tag && words.length >= 2 && words.length <= 5;
      });

    if (tags.length < 10) {
      throw new Error('At least 10 specific, long-tail tags are required');
    }

    return {
      title: parsed.title,
      description: parsed.description,
      tags: tags.join(', '),
      keywords: tags,
      imageAnalysis: {}
    };
  } catch (error) {
    logger.error('OpenAI', 'Direct fetch content generation failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
