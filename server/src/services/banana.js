import { config } from '../config.js';
import { ApiError } from '../utils/http.js';

/**
 * A small warm cache of Banana API puzzles keeps a short outage from blocking
 * gameplay. Solutions stay on the server; a cached puzzle is stored on the
 * round row when a terminal is opened.
 */
const CACHE_SIZE = 4;
const cache = [];
let filling = false;

async function requestPuzzle() {
  const response = await fetch(config.bananaApiUrl, {
    headers: {
      accept: 'application/json',
      'user-agent': 'TheLastSignal/1.0 (college project)',
    },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`Puzzle API responded with ${response.status}`);
  }

  const data = await response.json();
  const solution = Number(data.solution);

  if (
    typeof data.question !== 'string' ||
    !/^https?:\/\//i.test(data.question) ||
    !Number.isInteger(solution)
  ) {
    throw new Error('Puzzle API returned an unexpected payload');
  }

  return { questionUrl: data.question, solution };
}

async function refillCache() {
  if (filling) return;
  filling = true;

  try {
    while (cache.length < CACHE_SIZE) {
      try {
        cache.push(await requestPuzzle());
      } catch {
        break;
      }
    }
  } finally {
    filling = false;
  }
}

/**
 * Fetches a single banana puzzle. The solution is kept on the server and is
 * never included in a response to the browser until a round has been answered.
 * Cached puzzles are served instantly while the cache refills in the
 * background; when the cache is empty, the API is retried before giving up.
 */
export async function fetchPuzzle(attempts = 3) {
  if (cache.length > 0) {
    const puzzle = cache.shift();
    void refillCache();
    return puzzle;
  }

  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const puzzle = await requestPuzzle();
      void refillCache();
      return puzzle;
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[banana] Could not fetch a puzzle:', lastError?.message);
  throw new ApiError(
    503,
    'The cipher network is out of range. Try this terminal again in a moment.',
  );
}

/** A useful hint that narrows the answer without giving it away. */
export function buildHint(solution) {
  const low = Math.max(0, solution - 2);
  const high = Math.min(9, solution + 2);
  return `The missing value is a single digit between ${low} and ${high}.`;
}
