import { z } from 'zod';

export const ContentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(50, 'Title must be 50 characters or less')
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Title cannot contain JSON syntax'
    ),
  description: z.string()
    .min(150, 'Description must be at least 150 characters')
    .max(200, 'Description must be 200 characters or less')
    .refine(
      (val) => !val.includes('{') && !val.includes('}'),
      'Description cannot contain JSON syntax'
    ),
  tags: z.string()
    .min(1, 'Tags are required')
    .refine(
      (val) => {
        const tagCount = val.split(',').filter(Boolean).length;
        return tagCount >= 10 && tagCount <= 12;
      },
      'Must have between 10 and 12 tags'
    )
});

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

export const ProductFocusSchema = z.string()
  .min(1, 'Product focus is required')
  .max(100, 'Product focus must be 100 characters or less');

export type ValidatedContent = z.infer<typeof ContentSchema>;
export type ValidatedImage = z.infer<typeof ImageSchema>;