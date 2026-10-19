import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { answerQuestion } from '../services/queryService.js';

const schema = z.object({
  question: z.string().trim().min(1, 'question is required').max(1000, 'question must be 1,000 characters or fewer'),
  topK: z.number().int().min(1).max(10).optional(),
});

export const queryRouter = Router();

queryRouter.post('/', validateBody(schema), async (req, res) => {
  res.json(await answerQuestion(req.body.question, { topK: req.body.topK }));
});
