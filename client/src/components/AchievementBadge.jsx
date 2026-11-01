export default function AchievementBadge({ achievement, awarded = true }) {
  return (
    <li className={`ls-achievement${awarded ? ' is-earned' : ' is-locked'}`}>
      <span className="ls-achievement-icon" aria-hidden="true">
        {achievement.icon ?? '★'}
      </span>
      <span className="ls-achievement-copy">
        <strong>{achievement.title}</strong>
        <span>{achievement.description}</span>
        {achievement.awardedAt && (
          <em>Unlocked {new Date(achievement.awardedAt).toLocaleDateString()}</em>
        )}
      </span>
    </li>
  );
}
