import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ApiError } from '../utils/http.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Please sign in to continue.'));
  }

  try {
    const payload = jwt.verify(header.slice(7).trim(), config.jwtSecret);
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) throw new Error('Invalid token subject');
    req.userId = userId;
    return next();
  } catch {
    return next(new ApiError(401, 'Your session has expired. Please sign in again.'));
  }
}
