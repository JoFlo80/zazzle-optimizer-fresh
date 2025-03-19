import React, { useState, useCallback } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SimpleImageUploadProps {
  onImageChange?: (file: File | null) => void;
  label?: string;
  maxSizeMB?: number;
}

const SimpleImageUpload: React.FC<SimpleImageUploadProps> = ({ 
  onImageChange,
  label = 'Upload Image',
  maxSizeMB = 20
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError(null);

    if (!file) {
      onImageChange?.(null);
      setCurrentFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`Image must be smaller than ${maxSizeMB}MB`);
      return;
    }

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCurrentFile(file);

    // Notify parent component
    onImageChange?.(file);
  }, [onImageChange, maxSizeMB]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const fakeEvent = {
        target: {
          files: [file]
        }
      } as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);

  const handleDelete = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCurrentFile(null);
    setError(null);
    onImageChange?.(null);
    toast.success('Image deleted. Upload a new one.');
  }, [previewUrl, onImageChange]);

  // Cleanup preview URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return (
    <div className="space-y-4">
      {!currentFile ? (
        <div className="flex flex-col items-center justify-center w-full">
          <label className="w-full">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
                ${error ? 'border-red-400' : 'border-blue-400'}
                hover:border-blue-500 cursor-pointer`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {isDragging ? 'Drop image here' : label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Click to select or drag & drop
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                (Max size: {maxSizeMB}MB)
              </p>
            </div>
          </label>
        </div>
      ) : (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto object-cover"
              />
            )}
            <button
              onClick={handleDelete}
              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition-colors shadow-md"
              title="Delete image"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};

export default SimpleImageUpload;