import type { AuthUser } from '../auth';

type Props = {
  user: AuthUser;
  onSignOut: () => void;
};

export function SignedInBar({ user, onSignOut }: Props) {
  return (
    <div className="signed-in-bar">
      <div className="user">
        {user.picture ? (
          <img src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <div className="avatar-fallback" aria-hidden>
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="user-text">
          <div className="user-name">{user.name}</div>
          <div className="muted small">{user.email}</div>
        </div>
      </div>
      <button className="secondary" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );
}
