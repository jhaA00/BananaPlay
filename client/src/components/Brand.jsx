import { Link } from 'react-router-dom';

export default function Brand({ to = '/' }) {
  return (
    <Link to={to} className="ls-brand" aria-label="The Last Signal home">
      <span className="ls-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="34" height="34" fill="none">
          <path
            d="M20 33V16"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M14 33h12"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="11.5" r="3.4" stroke="currentColor" strokeWidth="2.2" />
          <path
            d="M13.2 8.3a9.4 9.4 0 0 0 0 6.4M26.8 8.3a9.4 9.4 0 0 1 0 6.4M8.8 4.6a15 15 0 0 0 0 13.8M31.2 4.6a15 15 0 0 1 0 13.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="ls-brand-text">
        <strong>The Last Signal</strong>
        <small>Survival Adventure</small>
      </span>
    </Link>
  );
}
