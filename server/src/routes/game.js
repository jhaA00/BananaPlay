import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  loadGameState,
  restartRun,
  submitAnswer,
  useHint,
} from '../services/game.js';
import { ApiError, asyncHandler } from '../utils/http.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    res.json(await loadGameState(req.userId));
  }),
);

router.post(
  '/answer',
  asyncHandler(async (req, res) => {
    const roundId = Number(req.body?.roundId);
    const answer = Number(req.body?.answer);

    if (!Number.isInteger(roundId)) {
      throw new ApiError(400, 'A valid puzzle is required.');
    }
    if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
      throw new ApiError(400, 'Enter a single digit from 0 to 9.');
    }

    res.json(await submitAnswer(req.userId, roundId, answer));
  }),
);

router.post(
  '/hint',
  asyncHandler(async (req, res) => {
    const roundId = Number(req.body?.roundId);
    if (!Number.isInteger(roundId)) {
      throw new ApiError(400, 'A valid puzzle is required.');
    }
    res.json(await useHint(req.userId, roundId));
  }),
);

router.post(
  '/restart',
  asyncHandler(async (req, res) => {
    res.json(await restartRun(req.userId));
  }),
);

export default router;
