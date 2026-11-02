export default function ObjectiveTracker({ objectives = [], missionStatus = 'in_progress' }) {
  const completed = objectives.filter((objective) => objective.status === 'completed').length;

  return (
    <aside className="ls-explore-objectives" aria-label="Mission objectives">
      <div className="ls-explore-panel-head">
        <span>Objectives</span>
        <strong>
          {completed}/{objectives.length}
        </strong>
      </div>
      <ol>
        {objectives.map((objective) => (
          <li key={objective.key} className={`is-${objective.status}`}>
            <span className="ls-objective-mark" aria-hidden="true">
              {objective.status === 'completed' ? '✓' : objective.status === 'locked' ? '·' : '→'}
            </span>
            <span className="ls-objective-copy">
              <span className="ls-objective-label">{objective.label}</span>
              {objective.status !== 'completed' && objective.status !== 'locked' && objective.description && (
                <span className="ls-objective-note">{objective.description}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
      {missionStatus === 'completed' && <p className="ls-explore-panel-foot">Location secure</p>}
    </aside>
  );
}
