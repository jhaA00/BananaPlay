import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="empty-page">
      <div className="empty-emoji" aria-hidden="true">
        🙈
      </div>
      <h1>This page slipped away</h1>
      <p>The page you were looking for does not exist. Let&apos;s get you back to the game.</p>
      <Link to="/play" className="btn btn-primary btn-inline">
        Back to the puzzle
      </Link>
    </div>
  );
}
