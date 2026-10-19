import { AppError } from '../errors.js';

export const validateBody = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request body', details);
  }
  req.body = parsed.data;
  next();
};
