import { z } from 'zod';

// Validation constants
export const VALIDATION_RULES = {
  title: {
    maxLength: 50,
    minLength: 10,
    requiredWords: [
      'personalized',
      'custom',
      'unique',
      'special',
      'mom',
      'mother',
      'mug',
      'gift'
    ],
    bannedWords: [
      'nice',
      'good',
      'great',
      'awesome',
      'cool',
      'best'
    ],
    emotionalWords: [
      'special',
      'cherished',
      'heartfelt',
      'memorable',
      'delightful',
      'treasured',
      'beloved',
      'precious',
      'loving',
      'thoughtful'
    ]
  },
  description: {
    maxLength: 200,
    minLength: 150,
    requiredElements: {
      productFeatures: true,
      benefits: true,
      personalization: true,
      callToAction: true,
      emotionalAppeal: true,
      practicalUse: true,
      giftingValue: true,
      mothersDayValue: true
    },
    requiredPhrases: [
      ['perfect for', 'ideal for', 'designed for'],
      ['customize', 'personalize', 'make it yours'],
      ['order now', 'shop now', 'get yours'],
      ['celebrate', 'cherish', 'treasure'],
      ['special', 'meaningful', 'memorable'],
      ['mom', 'mother', 'mama'],
      ['love', 'appreciation', 'gratitude']
    ]
  },
  tags: {
    min: 10,
    max: 12,
    minLength: 3,
    maxLength: 30,
    requiredCategories: [
      'product_type',
      'design_style',
      'occasion',
      'personalization',
      'emotion',
      'target_audience',
      'gifting',
      'mothers_day'
    ]
  }
} as const;

// Enhanced helper functions for content validation
const containsRequiredWords = (text: string, words: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return words.some(word => lowerText.includes(word.toLowerCase()));
};

const containsEmotionalWords = (text: string): boolean => {
  return VALIDATION_RULES.title.emotionalWords.some(word => 
    text.toLowerCase().includes(word.toLowerCase())
  );
};

const containsBannedWords = (text: string, words: string[]): boolean => {
  const lowerText = text.toLowerCase();
  return words.some(word => lowerText.includes(word.toLowerCase()));
};

const hasRequiredPhrases = (text: string, phraseGroups: string[][]): boolean => {
  const lowerText = text.toLowerCase();
  return phraseGroups.every(group => 
    group.some(phrase => lowerText.includes(phrase.toLowerCase()))
  );
};

const hasValidDescription = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Check for product features
  const hasFeatures = /features|includes|designed|made with|crafted|created/i.test(text);
  
  // Check for benefits
  const hasBenefits = /perfect for|celebrate|cherish|treasure|create/i.test(text);
  
  // Check for personalization
  const hasPersonalization = /customize|personalize|your|name|text/i.test(text);
  
  // Check for emotional appeal
  const hasEmotionalAppeal = /special|meaningful|memorable|unique|cherished/i.test(text);
  
  // Check for practical uses
  const hasPracticalUses = /coffee|tea|drink|beverage|morning/i.test(text);
  
  // Check for gifting value
  const hasGiftingValue = /perfect gift|ideal present|thoughtful gift|special gift/i.test(text);
  
  // Check for Mother's Day value
  const hasMothersDayValue = /mother|mom|mama|mother's day|maternal/i.test(text);
  
  // Check for call to action
  const hasCallToAction = /order|shop|get yours|make it yours/i.test(text);
  
  return hasFeatures && hasBenefits && hasPersonalization && 
         hasEmotionalAppeal && hasPracticalUses && hasGiftingValue && 
         hasMothersDayValue && hasCallToAction;
};

const isValidTag = (tag: string): boolean => {
  // Basic validation
  if (tag.length < VALIDATION_RULES.tags.minLength || 
      tag.length > VALIDATION_RULES.tags.maxLength ||
      /[^\w\s-]/.test(tag) || // Only allow letters, numbers, spaces, and hyphens
      tag.includes('  ') || // No double spaces
      /^(the|and|or|in|on|at|to)$/i.test(tag)) { // No common stop words
    return false;
  }

  // Check for full sentences
  const wordCount = tag.split(/\s+/).length;
  if (wordCount > 3) {
    return false;
  }

  // Check for promotional language
  if (/best|amazing|awesome|incredible|perfect/i.test(tag)) {
    return false;
  }

  return true;
};

const categorizeTag = (tag: string): string => {
  const lowerTag = tag.toLowerCase();
  
  if (/mug|cup|coffee|tea|drinkware/i.test(lowerTag)) return 'product_type';
  if (/handmade|elegant|classic|modern/i.test(lowerTag)) return 'design_style';
  if (/mothers day|celebration|holiday/i.test(lowerTag)) return 'occasion';
  if (/custom|personalized|unique/i.test(lowerTag)) return 'personalization';
  if (/special|cherished|heartfelt|memorable/i.test(lowerTag)) return 'emotion';
  if (/mom|mother|parent|family/i.test(lowerTag)) return 'target_audience';
  if (/gift idea|perfect gift|thoughtful present/i.test(lowerTag)) return 'gifting';
  if (/mothers day gift|mom present|maternal/i.test(lowerTag)) return 'mothers_day';
  
  return 'other';
};

const hasRequiredTagCategories = (tags: string[]): boolean => {
  const categories = new Set(tags.map(categorizeTag));
  return VALIDATION_RULES.tags.requiredCategories.every(cat => 
    categories.has(cat)
  );
};

// Enhanced content schema with strict validation
export const ContentSchema = z.object({
  title: z.string()
    .min(VALIDATION_RULES.title.minLength, `Title must be at least ${VALIDATION_RULES.title.minLength} characters`)
    .max(VALIDATION_RULES.title.maxLength, `Title must be ${VALIDATION_RULES.title.maxLength} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Title cannot contain JSON syntax'
    )
    .refine(
      (val) => containsRequiredWords(val, VALIDATION_RULES.title.requiredWords),
      'Title must include required keywords'
    )
    .refine(
      (val) => containsEmotionalWords(val),
      'Title must include emotional or engaging words'
    )
    .refine(
      (val) => !containsBannedWords(val, VALIDATION_RULES.title.bannedWords),
      'Title contains generic or banned words'
    ),

  description: z.string()
    .min(VALIDATION_RULES.description.minLength, `Description must be at least ${VALIDATION_RULES.description.minLength} characters`)
    .max(VALIDATION_RULES.description.maxLength, `Description must be ${VALIDATION_RULES.description.maxLength} characters or less`)
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Description cannot contain JSON syntax'
    )
    .refine(
      hasValidDescription,
      'Description must include product features, benefits, personalization, emotional appeal, practical uses, gifting value, Mother\'s Day value, and a call to action'
    )
    .refine(
      (val) => hasRequiredPhrases(val, VALIDATION_RULES.description.requiredPhrases),
      'Description must include required marketing phrases'
    ),

  tags: z.string()
    .transform(val => val.split(',').map(tag => tag.trim()).filter(Boolean))
    .refine(
      (tags) => tags.length >= VALIDATION_RULES.tags.min && tags.length <= VALIDATION_RULES.tags.max,
      `Must have between ${VALIDATION_RULES.tags.min} and ${VALIDATION_RULES.tags.max} tags`
    )
    .refine(
      (tags) => tags.every(isValidTag),
      'Tags must be between 3-30 characters and contain only letters, numbers, spaces, and hyphens'
    )
    .refine(
      (tags) => new Set(tags).size === tags.length,
      'Tags must be unique'
    )
    .refine(
      (tags) => !tags.some(tag => tag.split(' ').length > 3),
      'Tags should not be full sentences'
    )
    .refine(
      (tags) => hasRequiredTagCategories(tags),
      'Tags must cover all required categories: product type, design style, occasion, personalization, emotion, target audience, gifting, and Mother\'s Day'
    ),
});

// Image validation schema
export const ImageSchema = z.object({
  file: z.instanceof(File)
    .refine(
      (file) => file.size <= 5 * 1024 * 1024,
      'Image must be 5MB or less'
    )
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
      'Image must be JPEG, PNG, or WebP'
    )
});

// Model validation schema
export const ModelSchema = z.object({
  name: z.literal('gpt-4o')
});

export type ValidatedContent = z.infer<typeof ContentSchema>;
export type ValidatedImage = z.infer<typeof ImageSchema>;