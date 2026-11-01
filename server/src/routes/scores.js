import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getHistory,
  getLeaderboard,
  getPlayerProfile,
  getScoreSummary,
} from '../services/game.js';
import { ApiError, asyncHandler } from '../utils/http.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/leaderboard',
  asyncHandler(async (req, res) => {
    res.json(
      await getLeaderboard(req.userId, { page: req.query.page, pageSize: req.query.pageSize }),
    );
  }),
);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    res.json(await getScoreSummary(req.userId));
  }),
);

router.get(
  '/players/:username',
  asyncHandler(async (req, res) => {
    const profile = await getPlayerProfile(req.params.username);
    if (!profile) throw new ApiError(404, 'No survivor is transmitting under that name.');
    res.json(profile);
  }),
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    res.json(await getHistory(req.userId, { page: req.query.page, pageSize: req.query.pageSize }));
  }),
);

export default router;
