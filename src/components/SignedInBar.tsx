import type { AuthUser } from '../auth';
import { Button } from './ui/button';

type Props = {
  user: AuthUser;
  onSignOut: () => void;
};

export function SignedInBar({ user, onSignOut }: Props) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
      <div className="flex flex-1 items-center gap-2.5 min-w-0">
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
            className="size-9 rounded-full flex-shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="size-9 rounded-full flex items-center justify-center flex-shrink-0 bg-primary text-primary-foreground font-bold"
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="truncate font-semibold text-sm">{user.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {user.email}
          </div>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
