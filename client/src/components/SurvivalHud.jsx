import RankBadge from './RankBadge.jsx';

export default function SurvivalHud({ game, missions = [], inventory = [], rank }) {
  const completed = missions.filter((mission) => mission.status === 'completed').length;
  const total = missions.length || 5;

  return (
    <section className="ls-hud" aria-label="Survival status">
      <div className="ls-hud-block">
        <span className="ls-hud-label">Lives</span>
        <span className="ls-lives" aria-label={`${game.lives} of 3 lives`}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`ls-life${index < game.lives ? ' is-full' : ''}`}
              aria-hidden="true"
            >
              ♥
            </span>
          ))}
        </span>
      </div>

      <div className="ls-hud-block">
        <span className="ls-hud-label">Score</span>
        <strong className="ls-hud-value">{game.score}</strong>
      </div>

      <div className="ls-hud-block">
        <span className="ls-hud-label">Missions</span>
        <strong className="ls-hud-value">
          {completed}
          <span className="ls-hud-faint">/{total}</span>
        </strong>
      </div>

      <div className="ls-hud-block ls-hud-rank">
        <span className="ls-hud-label">Survivor rank</span>
        <RankBadge rank={rank} subtle />
      </div>

      {inventory.length > 0 && (
        <div className="ls-hud-inventory" aria-label="Inventory">
          {inventory.map((item) => (
            <span key={item.key} className="ls-inventory-chip">
              {item.label}
              <b>{item.quantity}</b>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
