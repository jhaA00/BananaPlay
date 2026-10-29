export function Spinner({ size = 'md' }) {
  return <span className={`spinner spinner-${size}`} aria-hidden="true" />;
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="full-loader" role="status" aria-live="polite">
      <div className="loader-banana" aria-hidden="true">
        🍌
      </div>
      <p>{label}</p>
    </div>
  );
}
