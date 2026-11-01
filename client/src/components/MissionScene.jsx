import { sceneMeta } from '../game/scenes.js';

function Backdrop({ missionKey }) {
  return (
    <svg
      className="ls-scene-art"
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lsHaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2a33c" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#f2a33c" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="lsGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffc46b" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffc46b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="450" fill="#0a0c0e" />
      <rect width="800" height="240" fill="url(#lsHaze)" />
      <path d="M0 360 L800 360 L800 450 L0 450 Z" fill="#0d1013" />
      <path d="M0 360 L800 360" stroke="#2a2f35" strokeWidth="1.5" />

      {missionKey === 'shelter' && (
        <g stroke="#3a4048" strokeWidth="3" fill="none">
          <path d="M80 360 L240 210 L560 210 L720 360" />
          <path d="M150 360 L270 250 L530 250 L650 360" />
          <path d="M330 210 L330 90 L470 90 L470 210" />
          <path d="M330 130 L470 130M330 170 L470 170" strokeWidth="2" />
          <path d="M60 90 L60 300M36 120 L84 120M36 180 L84 180M36 240 L84 240" strokeWidth="2" />
          <path d="M720 110 L720 320" strokeWidth="2" />
          <rect x="600" y="190" width="90" height="120" fill="#12161a" />
          <path d="M645 190 L645 310" />
        </g>
      )}

      {missionKey === 'supply_run' && (
        <g stroke="#3a4048" strokeWidth="2" fill="#11151a">
          <rect x="20" y="150" width="120" height="210" />
          <rect x="150" y="90" width="90" height="270" />
          <rect x="570" y="120" width="110" height="240" />
          <rect x="690" y="180" width="90" height="180" />
          <path d="M20 190 L140 190M58 150 L58 360M106 150 L106 360" />
          <path d="M150 130 L240 130M180 90 L180 360M214 90 L214 360" />
          <path d="M300 330 L520 330 L520 375 L300 375 Z" fill="#171b20" />
          <path d="M325 300 L495 300 L510 330 L310 330 Z" fill="#14181d" />
          <path d="M340 335 L360 335M380 335 L400 335M420 335 L440 335" />
          <path d="M600 150 L660 150M615 190 L675 190" strokeWidth="4" />
        </g>
      )}

      {missionKey === 'power_station' && (
        <g stroke="#3a4048" strokeWidth="2" fill="none">
          <path d="M120 360 L150 120 L180 360M130 300 L170 300M138 240 L162 240M145 180 L155 180" />
          <path d="M120 150 L680 130M180 150 L680 150" strokeWidth="1.2" />
          <path d="M650 360 L670 170 L690 360M658 300 L682 300M664 240 L676 240" />
          <rect x="300" y="250" width="200" height="110" fill="#12161a" />
          <rect x="322" y="272" width="70" height="42" />
          <path d="M410 280 L480 280M410 300 L480 300M410 320 L480 320" />
          <circle cx="400" cy="228" r="14" strokeWidth="2" />
          <path d="M400 214 L400 200M386 228 L372 228M414 228 L428 228" />
          <path d="M250 380 L550 380" strokeWidth="2" />
        </g>
      )}

      {missionKey === 'network' && (
        <g stroke="#3a4048" strokeWidth="2" fill="none">
          <rect x="60" y="180" width="680" height="180" fill="#0f1318" />
          <path d="M60 180 L740 180M60 210 L740 210" />
          <rect x="120" y="250" width="120" height="110" fill="#12161a" />
          <path d="M140 270 L220 270M140 296 L220 296M140 322 L220 322" />
          <rect x="560" y="250" width="120" height="110" fill="#12161a" />
          <path d="M580 270 L660 270M580 296 L660 296M580 322 L660 322" />
          <ellipse cx="400" cy="125" rx="58" ry="24" />
          <path d="M400 149 L400 250M342 125 L458 125" />
          <path d="M350 105 A 68 68 0 0 1 450 105M365 92 A 96 96 0 0 1 435 92" strokeWidth="1.6" />
          <path d="M400 250 L400 360" strokeWidth="3" />
        </g>
      )}

      {missionKey === 'tower' && (
        <g stroke="#3a4048" strokeWidth="2" fill="none">
          <path d="M360 360 L392 90 L408 90 L440 360" />
          <path d="M370 300 L430 300M378 240 L422 240M384 180 L416 180M388 130 L412 130" />
          <path d="M366 320 L434 320M374 260 L426 260M380 200 L420 200" strokeWidth="1.2" />
          <path d="M392 90 L400 55 L408 90" />
          <circle cx="400" cy="50" r="5" fill="#ffc46b" stroke="none" />
          <circle cx="400" cy="50" r="30" fill="url(#lsGlow)" stroke="none" />
          <path d="M400 50 L470 18M400 50 L330 18M400 50 L500 60M400 50 L300 60" strokeWidth="1" strokeOpacity="0.5" />
          <path d="M120 360 L160 250 L200 360M600 360 L640 250 L680 360" />
          <path d="M0 385 L800 385" strokeWidth="1.5" />
        </g>
      )}

      <ellipse cx="400" cy="430" rx="380" ry="70" fill="#050607" opacity="0.7" />
    </svg>
  );
}

function positionFor(meta, key, index, total) {
  if (meta.positions?.[key]) return meta.positions[key];
  return {
    x: 20 + ((index + 1) / (total + 1)) * 60,
    y: 66,
  };
}

export default function MissionScene({
  mission,
  onTerminal,
  onFlavor,
  busyKey = null,
  disabled = false,
}) {
  const meta = sceneMeta(mission.key);
  const allObjects = mission.terminals.length + mission.flavor.length;

  return (
    <div className={`ls-scene ls-scene-${mission.key}`}>
      <Backdrop missionKey={mission.key} />
      <div className="ls-scene-scanlines" aria-hidden="true" />
      <div className="ls-scene-shade" aria-hidden="true" />

      <div className="ls-scene-caption">
        <span className="ls-scene-location">{mission.location}</span>
        <span className="ls-scene-hint">
          {mission.status === 'completed'
            ? 'Mission complete'
            : 'Click a glowing object to interact'}
        </span>
      </div>

      {mission.terminals.map((terminal, index) => {
        const position = positionFor(meta, terminal.key, index, allObjects);
        const busy = busyKey === terminal.key;
        return (
          <button
            key={terminal.key}
            type="button"
            className={`ls-object ls-object-terminal${terminal.solved ? ' is-solved' : ''}${
              busy ? ' is-busy' : ''
            }`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onTerminal(terminal)}
            disabled={disabled || busy || terminal.solved}
            title={terminal.solved ? `${terminal.label} — bypassed` : terminal.label}
          >
            <span className="ls-object-icon" aria-hidden="true">
              {meta.terminalIcons?.[terminal.key] ?? '🔒'}
            </span>
            <span className="ls-object-label">{terminal.label}</span>
            <span className="ls-object-state">
              {terminal.solved ? 'Bypassed' : busy ? 'Connecting…' : 'Locked'}
            </span>
          </button>
        );
      })}

      {mission.flavor.map((object, index) => {
        const position = positionFor(meta, object.key, index + mission.terminals.length, allObjects);
        return (
          <button
            key={object.key}
            type="button"
            className="ls-object ls-object-flavor"
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            onClick={() => onFlavor(object)}
            title={object.label}
          >
            <span className="ls-object-icon" aria-hidden="true">
              {meta.flavorIcons?.[object.key] ?? '🔎'}
            </span>
            <span className="ls-object-label">{object.label}</span>
          </button>
        );
      })}
    </div>
  );
}
