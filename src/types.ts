export interface ProductData {
  category: string;
  productFocus: string;
  images: File[];
}

export interface ImageAnalysis {
  objects: string[];
  colors: string[];
  textures: string[];
  text: string[];
}

export interface GeneratedContent {
  title: string;
  description: string;
  tags: string;
  keywords: string[];
  imageAnalysis: ImageAnalysis;
}

export interface ImageUploadProps {
  onImageUpload: (files: File[]) => void;
  images: File[];
  disabled?: boolean;
}

export interface ContentDisplayProps {
  content: GeneratedContent | null;
  onCopy: (text: string) => void;
  onEdit: (field: keyof GeneratedContent, value: string) => void;
  darkMode: boolean;
  readOnly?: boolean;
}

export type ContentTone = 'casual' | 'professional' | 'sales';

export interface SocialMediaSectionProps {
  platform: keyof typeof PLATFORM_DIMENSIONS;
  dimensions: string;
  productFocus: string;
}

export interface SocialMediaSectionState {
  image: File | null;
  productDescription: string;
  description: string;
  hashtags: string;
  pinterestTitle?: string;
  isProcessing: boolean;
  processedPreview: string | null;
  hasGenerated: boolean;
  contentTone: ContentTone;
}

export interface SocialContent {
  description: string;
  hashtags: string;
  pinterestTitle?: string;
}

export interface GenerateContentParams {
  platform: string;
  productFocus: string;
  productDescription: string;
  contentType: 'description' | 'hashtags' | 'pinterestTitle';
  tone: ContentTone;
}

export interface PinterestTitleResponse {
  title: string;
  seoScore: number;
  keywordsUsed: string[];
  reasonForScore: string;
}

// Import this from the imageResizer utility to avoid circular dependencies
declare const PLATFORM_DIMENSIONS: {
  Instagram: { width: number; height: number };
  Facebook: { width: number; height: number };
  Pinterest: { width: number; height: number };
};