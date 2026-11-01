import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  abandonRun,
  interact,
  loadGameState,
  restartRun,
  startMission,
  startRun,
  submitAnswer,
  timeoutRound,
  useHint,
} from '../services/game.js';
import { MISSION_COUNT, missionCatalog } from '../game/missions.js';
import { ApiError, asyncHandler } from '../utils/http.js';

const router = Router();

router.use(requireAuth);

function parseMissionNumber(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > MISSION_COUNT) {
    throw new ApiError(400, 'Choose a valid mission.');
  }
  return number;
}

function parseRoundId(value) {
  const roundId = Number(value);
  if (!Number.isInteger(roundId) || roundId <= 0) {
    throw new ApiError(400, 'A valid puzzle is required.');
  }
  return roundId;
}

router.get(
  '/state',
  asyncHandler(async (req, res) => {
    res.json(await loadGameState(req.userId));
  }),
);

router.get('/missions', (_req, res) => {
  res.json({ missions: missionCatalog() });
});

router.post(
  '/start',
  asyncHandler(async (req, res) => {
    const mode = req.body?.mode === 'new' ? 'new' : 'continue';
    res.json(await startRun(req.userId, mode));
  }),
);

router.post(
  '/missions/:missionNumber/start',
  asyncHandler(async (req, res) => {
    const missionNumber = parseMissionNumber(req.params.missionNumber);
    res.json(await startMission(req.userId, missionNumber));
  }),
);

router.post(
  '/interact',
  asyncHandler(async (req, res) => {
    const missionNumber = parseMissionNumber(req.body?.missionNumber);
    const objectiveKey = String(req.body?.objectiveKey ?? '').trim();

    if (!/^[a-z0-9_]{3,64}$/.test(objectiveKey)) {
      throw new ApiError(400, 'Choose a valid interactive object.');
    }

    res.json(await interact(req.userId, missionNumber, objectiveKey));
  }),
);

router.post(
  '/answer',
  asyncHandler(async (req, res) => {
    const roundId = parseRoundId(req.body?.roundId);
    const answer = Number(req.body?.answer);

    if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
      throw new ApiError(400, 'Enter a single digit from 0 to 9.');
    }

    res.json(await submitAnswer(req.userId, roundId, answer));
  }),
);

router.post(
  '/hint',
  asyncHandler(async (req, res) => {
    const roundId = parseRoundId(req.body?.roundId);
    res.json(await useHint(req.userId, roundId));
  }),
);

router.post(
  '/timeout',
  asyncHandler(async (req, res) => {
    const roundId = parseRoundId(req.body?.roundId);
    res.json(await timeoutRound(req.userId, roundId));
  }),
);

router.post(
  '/restart',
  asyncHandler(async (req, res) => {
    res.json(await restartRun(req.userId));
  }),
);

router.post(
  '/abandon',
  asyncHandler(async (req, res) => {
    res.json(await abandonRun(req.userId));
  }),
);

export default router;
