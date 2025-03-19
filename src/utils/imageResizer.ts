interface ImageDimensions {
  width: number;
  height: number;
}

interface ResizeOptions extends ImageDimensions {
  mode?: 'cover'; // Only support cover mode
}

export const PLATFORM_DIMENSIONS = {
  Instagram: { width: 1080, height: 1080 },
  Facebook: { width: 940, height: 788 },
  Pinterest: { width: 1000, height: 1500 }
} as const;

export async function resizeImage(
  file: File,
  options: ResizeOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      // Set canvas to target dimensions
      canvas.width = options.width;
      canvas.height = options.height;

      // Calculate scaling and positioning
      const targetAspectRatio = options.width / options.height;
      const imageAspectRatio = img.width / img.height;

      let sx = 0; // source x
      let sy = 0; // source y
      let sWidth = img.width; // source width
      let sHeight = img.height; // source height

      // Always use cover mode - crop to fill while maintaining aspect ratio
      if (imageAspectRatio > targetAspectRatio) {
        // Image is wider - crop sides
        sWidth = img.height * targetAspectRatio;
        sx = (img.width - sWidth) / 2;
      } else {
        // Image is taller - crop top/bottom
        sHeight = img.width / targetAspectRatio;
        sy = (img.height - sHeight) / 2;
      }

      // Draw the cropped and scaled image
      ctx.drawImage(
        img,
        sx, sy, sWidth, sHeight, // Source rectangle
        0, 0, options.width, options.height // Destination rectangle
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        0.92 // Slightly higher quality for better results
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}