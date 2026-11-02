import useExploration from '../../hooks/useExploration.js';
import AreaTransition from './AreaTransition.jsx';
import InteractionPrompt from './InteractionPrompt.jsx';
import InventoryPanel from './InventoryPanel.jsx';
import ObjectiveTracker from './ObjectiveTracker.jsx';

const DIRECTIONS = [
  { key: 'up', label: 'Move up', glyph: '▲' },
  { key: 'left', label: 'Move left', glyph: '◀' },
  { key: 'down', label: 'Move down', glyph: '▼' },
  { key: 'right', label: 'Move right', glyph: '▶' },
];

export default function ExplorationScene({
  mission,
  world,
  active = true,
  busy = false,
  onInteract,
  onPosition,
}) {
  const {
    canvasRef,
    containerRef,
    nearest,
    areaCaption,
    attemptInteract,
    pressDirection,
    releaseDirection,
  } = useExploration({
    world,
    active: active && !busy,
    onInteract,
    onPosition,
  });

  const area = world.areas.find((item) => item.key === world.state.areaKey) ?? world.areas[0];
  const powerRestored = world.objectives.find((item) => item.key === 'restore_power')?.status === 'completed';
  const gridRestored = world.objectives.find((item) => item.key === 'power_restored')?.status === 'completed';
  const dark = world.missionNumber === 1 && !powerRestored;

  return (
    <section className={`ls-explore ls-explore-${world.theme}`} aria-label={`${mission.title} exploration`}>
      <div className="ls-explore-canvas-wrap" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="ls-explore-canvas"
          role="img"
          aria-label={`${area.label}. Move with WASD or the arrow keys. Press E near an object to interact.`}
        />

        <div className="ls-explore-scanlines" aria-hidden="true" />
        <div className="ls-explore-shade" aria-hidden="true" />

        <div className="ls-explore-top">
          <span className="ls-explore-location">{area.label}</span>
          <span className={`ls-explore-light${dark ? ' is-dark' : ''}`}>
            {dark ? 'Emergency lighting' : gridRestored || world.missionNumber !== 1 ? 'Power online' : 'Grid stable'}
          </span>
        </div>

        <ObjectiveTracker objectives={world.objectives} missionStatus={world.missionStatus} />
        <InventoryPanel inventory={world.inventory} />

        <AreaTransition caption={areaCaption} />
        <InteractionPrompt object={nearest} busy={busy} onInteract={attemptInteract} />

        <div className="ls-explore-footer">
          <span className="ls-explore-keys">
            <kbd>WASD</kbd> / <kbd>↑↓←→</kbd> move · <kbd>E</kbd> interact
          </span>
          <span className="ls-explore-area-sub">{area.subtitle}</span>
        </div>

        <div className="ls-explore-dpad" aria-label="Touch movement controls">
          {DIRECTIONS.map((direction) => (
            <button
              key={direction.key}
              type="button"
              className={`ls-dpad-key is-${direction.key}`}
              aria-label={direction.label}
              onPointerDown={(event) => {
                event.preventDefault();
                pressDirection(direction.key);
              }}
              onPointerUp={() => releaseDirection(direction.key)}
              onPointerLeave={() => releaseDirection(direction.key)}
              onPointerCancel={() => releaseDirection(direction.key)}
              onLostPointerCapture={() => releaseDirection(direction.key)}
              onContextMenu={(event) => event.preventDefault()}
            >
              {direction.glyph}
            </button>
          ))}
          <button
            type="button"
            className="ls-dpad-key is-interact"
            aria-label="Interact"
            onPointerDown={(event) => {
              event.preventDefault();
              attemptInteract();
            }}
          >
            E
          </button>
        </div>
      </div>
    </section>
  );
}
