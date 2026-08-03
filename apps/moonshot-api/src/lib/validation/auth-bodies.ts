import { z } from 'zod';

export const kdsLoginBodySchema = z.object({
  cafeSlug: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export type KdsLoginBody = z.infer<typeof kdsLoginBodySchema>;

export const adminLoginBodySchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export type AdminLoginBody = z.infer<typeof adminLoginBodySchema>;

/** Parse with Zod; returns field errors joined for ApiHttpError messages. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { ok: true, data: result.data };
  const msg = result.error.issues.map((i) => i.message).join('; ') || 'Invalid request body';
  return { ok: false, error: msg };
}
