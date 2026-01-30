import { z } from 'zod';

export const signUpSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .endsWith('@ycce.in', 'Must be a YCCE email (@ycce.in)'),
});

export const profileSetupSchema = z.object({
  branch: z.string().min(1, 'Branch is required'),
  department: z.string().min(1, 'Department is required'),
  year: z.number().min(1).max(4),
  semester: z.number().min(1).max(8),
  enrollment_number: z.string().min(1, 'Enrollment number is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  phone_number: z.string().regex(/^[0-9]{10}$/, 'Must be a valid 10-digit phone number'),
  anonymous_username: z.string().min(3).max(30).optional(),
});

export const confessionSchema = z.object({
  content: z.string().min(1).max(5000, 'Confession must be less than 5000 characters'),
  image_url: z.string().url().optional(),
});

export const replySchema = z.object({
  confession_id: z.string().uuid(),
  content: z.string().min(1).max(2000, 'Reply must be less than 2000 characters'),
  parent_reply_id: z.string().uuid().optional(),
});