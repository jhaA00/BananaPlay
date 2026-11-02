const RESOURCE_ICONS = {
  flashlight: '🔦',
  food: '🥫',
  medicine: '💊',
  batteries: '🔋',
  fuel: '⛽',
  parts: '🔧',
  equipment: '🎒',
};

export default function InventoryPanel({ inventory = [] }) {
  return (
    <aside className="ls-explore-inventory" aria-label="Inventory">
      <div className="ls-explore-panel-head">
        <span>Pack</span>
        <strong>{inventory.reduce((total, item) => total + item.quantity, 0)}</strong>
      </div>
      {inventory.length === 0 ? (
        <p className="ls-explore-empty">Empty. Search the area.</p>
      ) : (
        <ul>
          {inventory.map((item) => (
            <li key={item.key}>
              <span aria-hidden="true">{RESOURCE_ICONS[item.key] ?? '▣'}</span>
              <span>{item.label}</span>
              <b>{item.quantity}</b>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
