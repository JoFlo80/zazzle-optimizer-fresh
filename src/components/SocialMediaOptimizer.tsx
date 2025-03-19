import React, { useState } from 'react';
import { Wand2, Copy, Download, AlertCircle } from 'lucide-react';
import SimpleImageUpload from './SimpleImageUpload';
import { resizeImage, downloadBlob, PLATFORM_DIMENSIONS } from '../utils/imageResizer';
import { toast } from 'react-hot-toast';
import type { ContentTone, SocialContent } from '../types';
import { generateSocialContent } from '../services/socialContent';

interface PlatformSection {
  platform: 'Instagram' | 'Facebook' | 'Pinterest';
  title: string;
  description: string;
  image: File | null;
  content: SocialContent | null;
  isGenerating: boolean;
}

interface SocialMediaOptimizerProps {
  productFocus: string;
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

const SocialMediaOptimizer: React.FC<SocialMediaOptimizerProps> = ({ productFocus }) => {
  const [productDescription, setProductDescription] = useState('');
  const [selectedTone, setSelectedTone] = useState<ContentTone>('casual');
  const [platforms, setPlatforms] = useState<PlatformSection[]>([
    {
      platform: 'Instagram',
      title: 'Instagram Post',
      description: `${PLATFORM_DIMENSIONS.Instagram.width} × ${PLATFORM_DIMENSIONS.Instagram.height}px (Square)`,
      image: null,
      content: null,
      isGenerating: false
    },
    {
      platform: 'Facebook',
      title: 'Facebook Post',
      description: `${PLATFORM_DIMENSIONS.Facebook.width} × ${PLATFORM_DIMENSIONS.Facebook.height}px (Timeline)`,
      image: null,
      content: null,
      isGenerating: false
    },
    {
      platform: 'Pinterest',
      title: 'Pinterest Pin',
      description: `${PLATFORM_DIMENSIONS.Pinterest.width} × ${PLATFORM_DIMENSIONS.Pinterest.height}px (Vertical)`,
      image: null,
      content: null,
      isGenerating: false
    }
  ]);

  const handleImageChange = (platform: string, file: File | null) => {
    setPlatforms(prev => prev.map(p => 
      p.platform === platform ? { ...p, image: file } : p
    ));
  };

  const handleGenerateContent = async (platform: string) => {
    if (!productDescription.trim()) {
      toast.error('Please paste the product description first');
      return;
    }

    if (!productFocus) {
      toast.error('Please set the product focus in the Zazzle Optimizer tab first');
      return;
    }

    setPlatforms(prev => prev.map(p => 
      p.platform === platform ? { ...p, isGenerating: true } : p
    ));

    try {
      const content = await generateSocialContent({
        platform,
        productFocus,
        productDescription,
        contentType: 'description',
        tone: selectedTone
      });

      setPlatforms(prev => prev.map(p => 
        p.platform === platform ? { ...p, content, isGenerating: false } : p
      ));

      toast.success(`Generated content for ${platform}`);
    } catch (error) {
      console.error(`Failed to generate ${platform} content:`, error);
      toast.error(`Failed to generate content for ${platform}`);
      setPlatforms(prev => prev.map(p => 
        p.platform === platform ? { ...p, isGenerating: false } : p
      ));
    }
  };

  const handleDownloadImage = async (platform: string) => {
    const platformData = platforms.find(p => p.platform === platform);
    if (!platformData?.image) return;

    try {
      const dimensions = PLATFORM_DIMENSIONS[platformData.platform];
      const resizedBlob = await resizeImage(platformData.image, dimensions);
      const filename = `${platform.toLowerCase()}_${platformData.image.name}`;
      downloadBlob(resizedBlob, filename);
      toast.success(`Image optimized for ${platform}`);
    } catch (error) {
      console.error(`Failed to optimize ${platform} image:`, error);
      toast.error(`Failed to optimize image for ${platform}`);
    }
  };

  const handleCopyContent = (platform: string, type: 'description' | 'hashtags' | 'all') => {
    const platformData = platforms.find(p => p.platform === platform);
    if (!platformData?.content) return;

    let content = '';
    switch (type) {
      case 'description':
        content = platformData.content.description;
        break;
      case 'hashtags':
        content = platformData.content.hashtags;
        break;
      case 'all':
        content = `${platformData.content.description}\n\n${platformData.content.hashtags}`;
        break;
    }

    navigator.clipboard.writeText(content);
    toast.success(`Copied ${type === 'all' ? 'content' : type} to clipboard`);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="card-title">Content Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Content Tone</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {TONE_OPTIONS.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setSelectedTone(tone.value)}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${selectedTone === tone.value
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
            <label className="block text-sm font-medium mb-2">
              Paste Product Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              rows={4}
              placeholder="Copy and paste the product description from the Zazzle Optimizer tab..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This description will be used to generate optimized content for each platform
            </p>
          </div>

          {(!productDescription.trim() || !productFocus) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Required Information Missing
                  </h3>
                  <ul className="mt-2 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {!productDescription.trim() && (
                      <li>Paste the product description from the Zazzle Optimizer tab</li>
                    )}
                    {!productFocus && (
                      <li>Set the product focus in the Zazzle Optimizer tab first</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {platforms.map((platform) => (
        <div key={platform.platform} className="card">
          <h2 className="card-title">{platform.title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Recommended dimensions: {platform.description}
          </p>

          <div className="space-y-6">
            <SimpleImageUpload
              onImageChange={(file) => handleImageChange(platform.platform, file)}
              label={`Upload ${platform.platform} Image`}
            />

            <div className="flex flex-col gap-4">
              <button
                onClick={() => handleGenerateContent(platform.platform)}
                disabled={platform.isGenerating || !productDescription.trim() || !productFocus}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Wand2 className="h-5 w-5" />
                {platform.isGenerating ? 'Generating...' : `Generate ${platform.platform} Content`}
              </button>

              {platform.content && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium">Description</label>
                      <button
                        onClick={() => handleCopyContent(platform.platform, 'description')}
                        className="btn-secondary p-2"
                        title="Copy description"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={platform.content.description}
                      readOnly
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium">
                        {platform.platform === 'Pinterest' ? 'Keywords' : 'Hashtags'}
                      </label>
                      <button
                        onClick={() => handleCopyContent(platform.platform, 'hashtags')}
                        className="btn-secondary p-2"
                        title="Copy tags"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <textarea
                      value={platform.content.hashtags}
                      readOnly
                      className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                      rows={2}
                    />
                  </div>

                  <button
                    onClick={() => handleCopyContent(platform.platform, 'all')}
                    className="btn-secondary flex items-center justify-center gap-2"
                  >
                    <Copy className="h-5 w-5" />
                    Copy All Content
                  </button>
                </div>
              )}

              {platform.image && (
                <button
                  onClick={() => handleDownloadImage(platform.platform)}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Download className="h-5 w-5" />
                  Download Optimized Image
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SocialMediaOptimizer;