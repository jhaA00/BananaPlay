import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { ApiError, asyncHandler } from '../utils/http.js';
import { EMAIL_PATTERN, publicUser, USERNAME_PATTERN } from '../utils/presenters.js';

const router = Router();
const DUMMY_HASH = '$2a$10$zVflB3wV9u4obFJ.TH9tjeyrLHkyoDCxPf.sj/Q3PeqT3bpQFiJ9W';

router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!USERNAME_PATTERN.test(username)) {
      throw new ApiError(
        400,
        'Username must be 3–20 characters and can only contain letters, numbers and underscores.',
      );
    }
    if (!EMAIL_PATTERN.test(email)) {
      throw new ApiError(400, 'Please enter a valid email address.');
    }
    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters long.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    try {
      const { rows } = await query(
        `INSERT INTO users (username, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [username, email, passwordHash],
      );
      user = rows[0];
    } catch (error) {
      if (error.code === '23505') {
        if (error.constraint?.includes('email')) {
          throw new ApiError(409, 'An account with that email already exists.');
        }
        throw new ApiError(409, 'That username is already taken.');
      }
      throw error;
    }

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const identifier = String(req.body?.identifier ?? req.body?.email ?? '').trim();
    const password = String(req.body?.password ?? '');

    if (!identifier || !password) {
      throw new ApiError(400, 'Enter your email or username and password.');
    }

    const { rows } = await query(
      `SELECT * FROM users
        WHERE lower(email) = lower($1) OR lower(username) = lower($1)
        LIMIT 1`,
      [identifier],
    );

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'Incorrect email/username or password.');
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [req.userId]);
    if (!rows[0]) throw new ApiError(404, 'Account not found.');
    res.json({ user: publicUser(rows[0]) });
  }),
);

export default router;
