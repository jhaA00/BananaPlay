import Modal from '../Modal.jsx';

export default function StoryIntro({ mission, world, busy = false, onBegin }) {
  const objectives = world?.objectives ?? mission.objectives ?? [];
  const area = world?.areas?.[0];

  return (
    <Modal onClose={onBegin} labelledBy="story-intro-title" dismissible={false}>
      <div className="ls-story-intro">
        <p className="ls-kicker">
          Mission {String(mission.number).padStart(2, '0')} · {mission.location}
        </p>
        <h2 id="story-intro-title">{mission.title}</h2>
        <p className="ls-story-lead">{mission.story}</p>

        <div className="ls-story-grid">
          <div>
            <h3>Objectives</h3>
            <ol className="ls-story-objectives">
              {objectives.map((objective) => (
                <li key={objective.key}>{objective.label}</li>
              ))}
            </ol>
          </div>
          <div>
            <h3>Movement</h3>
            <ul className="ls-story-controls">
              <li>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd>
                <span>or arrow keys</span>
              </li>
              <li>
                <kbd>E</kbd>
                <span>interact with a nearby object</span>
              </li>
              <li>
                <kbd>Esc</kbd>
                <span>close a terminal or note</span>
              </li>
            </ul>
            <p className="ls-story-note">
              Start in {area?.label ?? mission.location}. Follow the objectives, not the glow.
            </p>
          </div>
        </div>

        <div className="ls-modal-actions">
          <button type="button" className="ls-btn ls-btn-amber" onClick={onBegin} disabled={busy}>
            {busy ? 'Opening the shelter…' : 'Step inside'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
