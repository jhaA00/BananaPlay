import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="ls-page">
      <section className="ls-panel ls-empty-panel">
        <p className="ls-kicker">Signal lost</p>
        <h1>This page does not exist</h1>
        <p>The coordinates are wrong. Nothing is transmitting from this location.</p>
        <Link to="/dashboard" className="ls-btn ls-btn-amber">
          Return to the dashboard
        </Link>
      </section>
    </div>
  );
}
