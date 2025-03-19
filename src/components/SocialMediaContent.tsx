import React, { useState, useCallback } from 'react';
import { Download, Copy, Wand2, AlertCircle } from 'lucide-react';
import SimpleImageUpload from './SimpleImageUpload';
import { resizeImage, downloadBlob, PLATFORM_DIMENSIONS } from '../utils/imageResizer';
import { toast } from 'react-hot-toast';
import type { SocialMediaSectionProps, SocialContent, ContentTone } from '../types';
import { generateSocialContent } from '../services/socialContent';

interface SocialMediaSectionState {
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

const TONE_OPTIONS: { value: ContentTone; label: string; description: string }[] = [
  {
    value: 'casual',
    label: 'Casual',
    description: 'Friendly and conversational tone, perfect for connecting with your audience'
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Business-focused tone, emphasizing quality and expertise'
  },
  {
    value: 'sales',
    label: 'Sales-Driven',
    description: 'Persuasive tone focused on conversions and calls-to-action'
  }
];

const SocialMediaSection: React.FC<SocialMediaSectionProps> = ({ platform, dimensions, productFocus }) => {
  const [state, setState] = useState<SocialMediaSectionState>({
    image: null,
    productDescription: '',
    description: '',
    hashtags: '',
    pinterestTitle: '',
    isProcessing: false,
    processedPreview: null,
    hasGenerated: false,
    contentTone: 'casual'
  });

  const handleImageChange = async (file: File | null) => {
    if (state.processedPreview) {
      URL.revokeObjectURL(state.processedPreview);
    }

    setState(prev => ({ 
      ...prev, 
      image: file, 
      processedPreview: null,
      hasGenerated: false
    }));

    if (file) {
      setState(prev => ({ ...prev, isProcessing: true }));
      try {
        const dimensions = PLATFORM_DIMENSIONS[platform];
        const resizedBlob = await resizeImage(file, {
          width: dimensions.width,
          height: dimensions.height
        });
        
        const previewUrl = URL.createObjectURL(resizedBlob);
        setState(prev => ({
          ...prev,
          processedPreview: previewUrl,
          isProcessing: false
        }));
      } catch (error) {
        console.error('Failed to process image:', error);
        toast.error('Failed to process image');
        setState(prev => ({ ...prev, isProcessing: false }));
      }
    }
  };

  const validateInputs = (): boolean => {
    if (!state.image) {
      return false;
    }

    if (!state.productDescription.trim()) {
      return false;
    }

    if (!productFocus) {
      return false;
    }

    return true;
  };

  const generateAllContent = async () => {
    if (!validateInputs()) {
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true 
    }));

    try {
      // Generate description
      const descriptionContent = await generateSocialContent({
        platform,
        productFocus,
        productDescription: state.productDescription,
        contentType: 'description',
        tone: state.contentTone
      });

      // Generate hashtags
      const hashtagsContent = await generateSocialContent({
        platform,
        productFocus,
        productDescription: state.productDescription,
        contentType: 'hashtags',
        tone: state.contentTone
      });

      // Generate Pinterest title if on Pinterest tab
      let pinterestTitle = '';
      if (platform === 'Pinterest') {
        const titleContent = await generateSocialContent({
          platform,
          productFocus,
          productDescription: state.productDescription,
          contentType: 'pinterestTitle',
          tone: state.contentTone
        });
        pinterestTitle = titleContent.pinterestTitle || '';
      }

      setState(prev => ({
        ...prev,
        description: descriptionContent.description,
        hashtags: hashtagsContent.hashtags,
        pinterestTitle,
        isProcessing: false,
        hasGenerated: true
      }));

      toast.success(`Generated content for ${platform}`);
    } catch (error) {
      console.error('Failed to generate content:', error);
      toast.error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const copyContent = (type: 'all' | 'description' | 'hashtags' | 'pinterestTitle') => {
    let content = '';
    switch (type) {
      case 'all':
        content = platform === 'Pinterest'
          ? `${state.pinterestTitle}\n\n${state.description}\n\n${state.hashtags}`
          : `${state.description}\n\n${state.hashtags}`;
        break;
      case 'description':
        content = state.description;
        break;
      case 'hashtags':
        content = state.hashtags;
        break;
      case 'pinterestTitle':
        content = state.pinterestTitle || '';
        break;
    }

    navigator.clipboard.writeText(content);
    toast.success(`Copied ${type === 'all' ? 'content' : type} to clipboard`);
  };

  const downloadImage = async () => {
    if (!state.image) return;

    setState(prev => ({ ...prev, isProcessing: true }));
    try {
      const dimensions = PLATFORM_DIMENSIONS[platform];
      const resizedBlob = await resizeImage(state.image, {
        width: dimensions.width,
        height: dimensions.height
      });
      
      const filename = `${platform.toLowerCase()}_${state.image.name}`;
      downloadBlob(resizedBlob, filename);
      toast.success(`Image optimized for ${platform}`);
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to optimize image');
    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const shouldShowValidation = !state.isProcessing && !state.hasGenerated;
  const isGenerateDisabled = !state.image || !state.productDescription.trim() || !productFocus || state.isProcessing;

  const renderPinterestTitle = () => {
    if (platform !== 'Pinterest' || !state.pinterestTitle) return null;

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Pinterest Title</label>
          <button
            onClick={() => copyContent('pinterestTitle')}
            className="btn-secondary p-2"
            title="Copy title"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ℹ️ SEO-optimized title for maximum Pinterest visibility (40 characters max)
          </p>
        </div>
        <div className="relative">
          <input
            type="text"
            value={state.pinterestTitle}
            readOnly
            className="w-full p-3 rounded-lg border border-[#D1D1D1] dark:border-gray-600 bg-white dark:bg-gray-800"
          />
          <span className="absolute right-3 top-3 text-sm text-gray-500">
            {state.pinterestTitle.length}/40
          </span>
        </div>
      </div>
    );
  };

  const renderHashtagsSection = () => {
    if (!state.hashtags) return null;

    if (platform === 'Pinterest') {
      return (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Suggested Keywords for Pinterest SEO</label>
            <button
              onClick={() => copyContent('hashtags')}
              className="btn-secondary p-2"
              title="Copy keywords"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ℹ️ Use these keywords in your pin description, board titles, or alt text for better search visibility.
            </p>
          </div>
          <textarea
            value={state.hashtags}
            readOnly
            className="w-full p-3 rounded-lg border border-[#D1D1D1] dark:border-gray-600 bg-white dark:bg-gray-800"
            rows={3}
          />
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium">Hashtags</label>
          <button
            onClick={() => copyContent('hashtags')}
            className="btn-secondary p-2"
            title="Copy hashtags"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={state.hashtags}
          readOnly
          className="w-full p-3 rounded-lg border border-[#D1D1D1] dark:border-gray-600 bg-white dark:bg-gray-800"
          rows={3}
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold mb-2">{platform} Image</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Recommended dimensions: {dimensions}
        </p>
        <SimpleImageUpload
          onImageChange={handleImageChange}
          label={`Upload ${platform} Image`}
          maxSizeMB={20}
        />
        
        {state.processedPreview && (
          <div className="mt-4">
            <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={state.processedPreview}
                alt={`${platform} Preview`}
                className="w-full h-auto"
                style={{
                  aspectRatio: `${PLATFORM_DIMENSIONS[platform].width}/${PLATFORM_DIMENSIONS[platform].height}`
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Content Generation</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Content Tone</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {TONE_OPTIONS.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setState(prev => ({ ...prev, contentTone: tone.value }))}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${state.contentTone === tone.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                    }`}
                >
                  <div className="font-medium mb-1">{tone.label}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {tone.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Paste Product Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={state.productDescription}
              onChange={(e) => {
                setState(prev => ({ 
                  ...prev, 
                  productDescription: e.target.value,
                  hasGenerated: false
                }));
              }}
              className={`w-full p-3 rounded-lg border bg-white dark:bg-gray-800 transition-colors min-h-[100px]
                ${shouldShowValidation && !state.productDescription.trim() 
                  ? 'border-red-500 dark:border-red-500' 
                  : 'border-[#D1D1D1] dark:border-gray-600'}`}
              placeholder="Copy and paste the product description from the Zazzle tab here..."
              rows={4}
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
              This description will be used to generate optimized content for {platform}
            </p>
          </div>

          {shouldShowValidation && !validateInputs() && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Required Fields
                  </h4>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {!state.image && <li>Upload an image</li>}
                    {!state.productDescription.trim() && <li>Paste the product description</li>}
                    {!productFocus && <li>Enter product focus in the Product Optimizer tab</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button
              onClick={generateAllContent}
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={isGenerateDisabled}
            >
              <Wand2 className="h-5 w-5" />
              {state.isProcessing ? 'Generating...' : `Generate ${platform} Content`}
            </button>
            
            {renderPinterestTitle()}

            {state.description && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium">Generated Description</label>
                  <button
                    onClick={() => copyContent('description')}
                    className="btn-secondary p-2"
                    title="Copy description"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={state.description}
                  readOnly
                  className="w-full p-3 rounded-lg border border-[#D1D1D1] dark:border-gray-600 bg-white dark:bg-gray-800 min-h-[100px]"
                  rows={5}
                />
              </div>
            )}

            {renderHashtagsSection()}

            {(state.description || state.hashtags) && (
              <button
                onClick={() => copyContent('all')}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                <Copy className="h-5 w-5" />
                Copy All Content
              </button>
            )}
          </div>

          {state.image && (
            <button
              onClick={downloadImage}
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={state.isProcessing}
            >
              <Download className="h-5 w-5" />
              {state.isProcessing ? 'Processing...' : 'Download Optimized Image'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface SocialMediaContentProps {
  productFocus: string;
}

const SocialMediaContent: React.FC<SocialMediaContentProps> = ({ productFocus }) => {
  return (
    <div className="space-y-8">
      <div className="card">
        <h2 className="card-title">Instagram</h2>
        <SocialMediaSection 
          platform="Instagram" 
          dimensions={`${PLATFORM_DIMENSIONS.Instagram.width} × ${PLATFORM_DIMENSIONS.Instagram.height}px (Square)`}
          productFocus={productFocus}
        />
      </div>

      <div className="card">
        <h2 className="card-title">Facebook</h2>
        <SocialMediaSection 
          platform="Facebook" 
          dimensions={`${PLATFORM_DIMENSIONS.Facebook.width} × ${PLATFORM_DIMENSIONS.Facebook.height}px (Timeline)`}
          productFocus={productFocus}
        />
      </div>

      <div className="card">
        <h2 className="card-title">Pinterest</h2>
        <SocialMediaSection 
          platform="Pinterest" 
          dimensions={`${PLATFORM_DIMENSIONS.Pinterest.width} × ${PLATFORM_DIMENSIONS.Pinterest.height}px (Vertical)`}
          productFocus={productFocus}
        />
      </div>
    </div>
  );
};

export default SocialMediaContent;