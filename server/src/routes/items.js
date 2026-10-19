import { Router } from 'express';
import * as repo from '../db/repository.js';
import { AppError } from '../errors.js';
import { invalidateIndex } from '../services/retrieval.js';

export const itemsRouter = Router();

itemsRouter.get('/', (req, res) => {
  res.json({ items: repo.listItems() });
});

itemsRouter.delete('/:id', (req, res) => {
  if (!repo.deleteItem(req.params.id)) throw new AppError(404, 'ITEM_NOT_FOUND', 'No item with that id');
  invalidateIndex();
  res.status(204).end();
});
