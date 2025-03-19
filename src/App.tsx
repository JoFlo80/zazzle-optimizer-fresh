import React, { useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

interface FormData {
  imageBase64: string;
  productFocus: string;
  productCategory: string;
  customPrompt: string;
}

interface GeneratedContent {
  title: string;
  description: string;
  tags: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    imageBase64: '',
    productFocus: '',
    productCategory: '',
    customPrompt: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setFormData(prev => ({ ...prev, imageBase64: base64 }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to process image');
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject('Failed to convert image');
        }
      };
      reader.onerror = () => reject('Failed to read file');
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productFocus || !formData.productCategory) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setGeneratedContent(data);
      toast.success('Content generated successfully');
    } catch (error) {
      toast.error('Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Zazzle Content Optimizer</h1>
          <p className="mt-2 text-gray-600">Generate optimized product descriptions, titles, and tags</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Image
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="image-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                    <span>Upload a file</span>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Focus <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.productFocus}
                onChange={(e) => setFormData(prev => ({ ...prev, productFocus: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Custom Coffee Mug"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.productCategory}
                onChange={(e) => setFormData(prev => ({ ...prev, productCategory: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Drinkware"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custom Prompt (Optional)
            </label>
            <textarea
              value={formData.customPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Add any specific requirements or focus points..."
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Generating...
              </>
            ) : (
              'Generate Content'
            )}
          </button>
        </form>

        {generatedContent && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Generated Content</h3>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Title</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{generatedContent.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md whitespace-pre-wrap">{generatedContent.description}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{generatedContent.tags}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;