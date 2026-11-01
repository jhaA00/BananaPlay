export default function RankBadge({ rank, subtle = false }) {
  const label = typeof rank === 'string' ? rank : rank?.label;
  if (!label) return null;

  return (
    <span className={`ls-rank-badge${subtle ? ' is-subtle' : ''}`}>
      <span className="ls-rank-pip" aria-hidden="true" />
      {label}
    </span>
  );
}
