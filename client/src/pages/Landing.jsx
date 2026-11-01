import { Link } from 'react-router-dom';
import Brand from '../components/Brand.jsx';

const FEATURES = [
  {
    icon: '🗺️',
    title: 'Five missions',
    text: 'Move from the sealed shelter to the ruins, the power station, the silent network and the last transmission tower.',
  },
  {
    icon: '🔐',
    title: 'Crack the ciphers',
    text: 'Every locked door, generator and console is protected by a numerical cipher served by the UOB Banana API.',
  },
  {
    icon: '📡',
    title: 'Send the signal',
    text: 'Survive on three lives, manage the clock and restore the only transmitter that can reach the outside world.',
  },
];

export default function Landing() {
  return (
    <div className="ls-landing">
      <header className="ls-landing-top">
        <Brand to="/" />
        <nav className="ls-landing-actions" aria-label="Account">
          <Link to="/login" className="ls-btn ls-btn-ghost">
            Sign in
          </Link>
          <Link to="/register" className="ls-btn ls-btn-amber">
            Create survivor ID
          </Link>
        </nav>
      </header>

      <section className="ls-hero">
        <div className="ls-hero-glow" aria-hidden="true" />
        <div className="ls-hero-grid" aria-hidden="true" />

        <div className="ls-hero-copy">
          <p className="ls-kicker">Emergency broadcast · Year 2049</p>
          <h1>
            The Last
            <br />
            <span>Signal</span>
          </h1>
          <p className="ls-hero-lead">
            The grid is dead. The cities are empty. Somewhere north, an emergency tower is still
            standing — and something out there is still transmitting. Get out of the shelter,
            restore the systems and send the last signal before the silence wins.
          </p>

          <div className="ls-hero-actions">
            <Link to="/register" className="ls-btn ls-btn-amber ls-btn-large">
              Begin the survival
            </Link>
            <Link to="/login" className="ls-btn ls-btn-ghost ls-btn-large">
              Continue a run
            </Link>
          </div>

          <dl className="ls-hero-stats">
            <div>
              <dt>Missions</dt>
              <dd>05</dd>
            </div>
            <div>
              <dt>Lives</dt>
              <dd>03</dd>
            </div>
            <div>
              <dt>Cipher window</dt>
              <dd>45s</dd>
            </div>
          </dl>
        </div>

        <div className="ls-hero-art" aria-hidden="true">
          <div className="ls-tower">
            <span className="ls-tower-mast" />
            <span className="ls-tower-beam" />
            <span className="ls-tower-base" />
            <span className="ls-tower-light" />
          </div>
          <div className="ls-hero-scanner">
            <span className="ls-scanner-line" />
            <p>TRANSMISSION TOWER // STATUS: UNKNOWN</p>
            <strong>SIGNAL DETECTED</strong>
            <small>51.5072° N · 0.1276° W</small>
          </div>
        </div>
      </section>

      <section className="ls-landing-section">
        <p className="ls-kicker">The mission</p>
        <h2>One survivor. Five locations. One chance to be heard.</h2>
        <div className="ls-feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="ls-feature-card">
              <span className="ls-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="ls-landing-cta">
        <div>
          <p className="ls-kicker">Survivor network</p>
          <h2>The tower is waiting.</h2>
          <p>
            Register a survivor ID, track your rank against every other player and keep your
            progress saved across sessions.
          </p>
        </div>
        <Link to="/register" className="ls-btn ls-btn-amber ls-btn-large">
          Create your survivor ID
        </Link>
      </section>

      <footer className="ls-landing-foot">
        <span>The Last Signal · College project</span>
        <span>
          Ciphers by{' '}
          <a href="https://marcconrad.com/uob/banana/" target="_blank" rel="noreferrer">
            UOB Banana
          </a>
        </span>
      </footer>
    </div>
  );
}
