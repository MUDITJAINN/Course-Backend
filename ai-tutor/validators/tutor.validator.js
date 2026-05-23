import { z } from "zod";

export const tutorChatSchema = z.object({
  message: z.string().min(1).max(2000),
});

export const lectureSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(20).max(100_000),
  order: z.coerce.number().int().min(0).optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(0).optional(),
});
