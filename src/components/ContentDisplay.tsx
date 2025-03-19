import React from 'react';
import { Copy, X } from 'lucide-react';
import type { ContentDisplayProps } from '../types';

const ContentDisplay: React.FC<ContentDisplayProps> = ({ content, onCopy, onEdit, darkMode, readOnly }) => {
  if (!content) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium">Title</label>
          <span className={`text-sm ${content.title.length > 50 ? 'text-red-500' : 'text-gray-500'}`}>
            {content.title.length}/50
          </span>
        </div>
        <div className="relative">
          <textarea
            value={content.title}
            onChange={(e) => onEdit('title', e.target.value)}
            className={`w-full p-3 border border-[#D1D1D1] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 resize-none ${
              readOnly ? 'opacity-75 cursor-not-allowed' : ''
            } ${content.title.length > 50 ? 'border-red-500' : ''}`}
            rows={2}
            readOnly={readOnly}
          />
          <button
            onClick={() => onCopy(content.title)}
            className="absolute right-2 top-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy title"
          >
            <Copy className="h-5 w-5" />
          </button>
        </div>
        {content.title.length > 50 && (
          <p className="text-sm text-red-500">
            Title exceeds Zazzle's 50 character limit
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Description</label>
        <div className="relative">
          <textarea
            value={content.description}
            onChange={(e) => onEdit('description', e.target.value)}
            className={`w-full p-3 border border-[#D1D1D1] dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 max-h-64 overflow-y-auto ${
              readOnly ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            rows={6}
            readOnly={readOnly}
          />
          <button
            onClick={() => onCopy(content.description)}
            className="absolute right-2 top-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Copy description"
          >
            <Copy className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Tags</label>
        <div className="flex flex-wrap gap-2">
          {content.tags.split(',').map((tag, index) => (
            <div key={index} className="tag-pill">
              {tag}
              {!readOnly && (
                <button
                  className="hover:text-gray-900 dark:hover:text-white"
                  onClick={() => {
                    const newTags = content.tags
                      .split(',')
                      .filter((_, i) => i !== index)
                      .join(',');
                    onEdit('tags', newTags);
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={() => onCopy(content.tags)}
          className="btn-secondary mt-2"
        >
          Copy All Tags
        </button>
      </div>
    </div>
  );
};

export default ContentDisplay;