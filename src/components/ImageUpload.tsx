import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { ImageUploadProps } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageUpload, images, disabled }) => {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const validateFile = useCallback((file: File): boolean => {
    if (!file) return false;

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File is too large. Maximum size is 5MB.`);
      return false;
    }

    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      toast.error(`Unsupported format. Please use JPG, PNG, or WebP.`);
      return false;
    }

    return true;
  }, []);

  const createPreviewUrl = useCallback((file: File): string => {
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.error('Failed to create preview URL:', error);
      return '';
    }
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (disabled) {
      toast.error('Image upload is disabled in read-only mode');
      return;
    }

    try {
      // Only take the first file
      const file = acceptedFiles[0];
      if (!file) return;

      if (!validateFile(file)) {
        return;
      }

      // Clean up existing preview URLs
      previewUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to revoke URL:', error);
        }
      });

      const previewUrl = createPreviewUrl(file);
      if (previewUrl) {
        setPreviewUrls([previewUrl]);
        onImageUpload([file]);
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to process image');
    }
  }, [onImageUpload, validateFile, previewUrls, createPreviewUrl, disabled]);

  const removeImage = useCallback((index: number, e: React.MouseEvent) => {
    if (disabled) {
      toast.error('Image removal is disabled in read-only mode');
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    
    try {
      // Revoke the URL for the removed image
      if (previewUrls[index]) {
        URL.revokeObjectURL(previewUrls[index]);
      }

      setPreviewUrls([]);
      onImageUpload([]);
      toast.success('Image removed');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  }, [onImageUpload, previewUrls, disabled]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    multiple: false,
    disabled: disabled || images.length > 0,
    noClick: false,
    onDropRejected: (fileRejections) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach(error => {
          toast.error(`${file.name}: ${error.message}`);
        });
      });
    }
  });

  const getDropzoneContent = () => {
    if (disabled) return 'Image upload is disabled in read-only mode';
    if (isDragReject) return 'Unsupported file type';
    if (isDragActive) return 'Drop image here';
    if (images.length > 0) return 'Only one image can be uploaded at a time';
    return 'Drag & drop an image here, or click to select';
  };

  // Cleanup preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Failed to revoke URL during cleanup:', error);
        }
      });
    };
  }, [previewUrls]);

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}
          ${isDragReject ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500' : ''}
          ${(disabled || images.length > 0) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <input {...getInputProps()} />
        {isDragReject ? (
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        ) : (
          <Upload className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
        )}
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {getDropzoneContent()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Upload a single image for product analysis
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Supported formats: JPG, PNG, WebP (max 5MB)
        </p>
      </div>

      {images.length > 0 && (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square">
            {previewUrls[0] && (
              <img
                src={previewUrls[0]}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image preview failed to load');
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="3" y="3" width="18" height="18" rx="2" ry="2"%3E%3C/rect%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"%3E%3C/circle%3E%3Cpolyline points="21 15 16 10 5 21"%3E%3C/polyline%3E%3C/svg%3E';
                }}
              />
            )}
            {!disabled && (
              <button
                onClick={(e) => removeImage(0, e)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;