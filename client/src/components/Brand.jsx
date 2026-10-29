import { Link } from 'react-router-dom';

export default function Brand({ to = '/play', size = 'md' }) {
  return (
    <Link to={to} className={`brand brand-${size}`} aria-label="Banana Puzzle home">
      <span className="brand-mark" aria-hidden="true">
        🍌
      </span>
      <span className="brand-text">
        Banana<span>Puzzle</span>
      </span>
    </Link>
  );
}
