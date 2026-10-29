import { config } from '../config.js';
import { ApiError } from '../utils/http.js';

/**
 * Fetches a single banana puzzle. The solution is kept on the server and is
 * never included in a response to the browser until a round has been answered.
 */
export async function fetchPuzzle(attempts = 3) {
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(config.bananaApiUrl, {
        headers: {
          accept: 'application/json',
          'user-agent': 'BananaPuzzle/1.0 (college project)',
        },
        signal: AbortSignal.timeout(10_000),
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
    } catch (error) {
      lastError = error;
    }
  }

  console.error('[banana] Could not fetch a puzzle:', lastError?.message);
  throw new ApiError(503, 'The puzzle service is taking a nap. Please try again in a moment.');
}

/** A useful hint that narrows the answer without giving it away. */
export function buildHint(solution) {
  const low = Math.max(0, solution - 2);
  const high = Math.min(9, solution + 2);
  return `The missing value is a single digit between ${low} and ${high}.`;
}
