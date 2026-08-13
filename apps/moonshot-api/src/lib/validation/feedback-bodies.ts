import { z } from 'zod';

export const reviewPromptBodySchema = z.object({
  action: z.enum(['opened_url', 'dismissed']),
});

export type ReviewPromptBody = z.infer<typeof reviewPromptBodySchema>;
