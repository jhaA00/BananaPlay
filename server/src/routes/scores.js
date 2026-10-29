import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getHistory, getLeaderboard } from '../services/game.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    res.json(await getLeaderboard(req.userId));
  }),
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    res.json({ runs: await getHistory(req.userId) });
  }),
);

export default router;
