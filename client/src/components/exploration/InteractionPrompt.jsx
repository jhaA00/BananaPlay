function statusText(object) {
  if (object.status === 'locked') return object.lockedLabel || 'Locked. Find what it needs.';
  if (object.status === 'unlocked') return 'Open and collect';
  if (object.action === 'transition') return 'Enter';
  if (object.action === 'exit') return 'Leave the area';
  if (object.action === 'refuel') return 'Refuel';
  if (object.action === 'repair') return 'Repair';
  if (object.action === 'activate') return 'Activate';
  if (object.terminal) return 'Security terminal';
  if (object.pickup?.length) return 'Collect';
  if (object.kind === 'note' || object.kind === 'board') return 'Read';
  if (object.kind === 'radio') return 'Listen';
  return 'Inspect';
}

export default function InteractionPrompt({ object, busy = false, onInteract }) {
  if (!object) {
    return (
      <div className="ls-explore-prompt is-idle">
        <span>Move close to an object to interact</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`ls-explore-prompt${busy ? ' is-busy' : ''}`}
      onClick={onInteract}
      disabled={busy}
    >
      <kbd>{busy ? '…' : 'E'}</kbd>
      <span className="ls-explore-prompt-copy">
        <strong>{object.label}</strong>
        <span>{busy ? 'Connecting…' : statusText(object)}</span>
      </span>
    </button>
  );
}
