import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { submitItem } from '../services/ingestService.js';

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('note'),
    content: z.string().trim().min(1, 'content is required').max(50_000, 'content must be 50,000 characters or fewer'),
    title: z.string().trim().max(200).optional(),
  }),
  z.object({
    type: z.literal('url'),
    url: z
      .string()
      .trim()
      .url('url must be a valid URL')
      .refine((u) => /^https?:\/\//i.test(u), 'url must start with http:// or https://'),
  }),
]);

export const ingestRouter = Router();

// 202 Accepted: the item is stored, indexing continues in the background.
ingestRouter.post('/', validateBody(schema), (req, res) => {
  const { rawContent, ...item } = submitItem(req.body);
  res.status(202).json({ item });
});
