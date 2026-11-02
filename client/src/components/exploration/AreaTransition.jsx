export default function AreaTransition({ caption }) {
  if (!caption) return null;

  return (
    <div key={caption.key} className="ls-explore-area-caption" aria-live="polite">
      <span>Now entering</span>
      <strong>{caption.label}</strong>
      {caption.subtitle && <em>{caption.subtitle}</em>}
    </div>
  );
}
