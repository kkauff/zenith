import { useEffect, useRef, useState } from "react";
import {
  Activity,
  FileText,
  Home as HomeIcon,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import type { AuthUser } from "../auth";
import { Brand } from "./ui/brand";
import { Button } from "./ui/button";

export type NavView = "home" | "programs" | "progress";

type Props = {
  user: AuthUser;
  current: NavView;
  onNavigate: (view: NavView) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
};

export function AppHeader({
  user,
  current,
  onNavigate,
  onSignOut,
  onOpenSettings,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const acctRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown when the user clicks outside it.
  useEffect(() => {
    if (!navOpen && !acctOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (navOpen && navRef.current && !navRef.current.contains(t)) {
        setNavOpen(false);
      }
      if (acctOpen && acctRef.current && !acctRef.current.contains(t)) {
        setAcctOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNavOpen(false);
        setAcctOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [navOpen, acctOpen]);

  const go = (view: NavView) => {
    onNavigate(view);
    setNavOpen(false);
  };

  return (
    <header className="flex items-center justify-between gap-3 pt-1">
      <button
        type="button"
        onClick={() => go("home")}
        aria-label="Home"
        className="flex items-baseline gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Brand as="h1" className="text-3xl leading-none m-0" />
        <span className="hidden sm:inline text-xs italic text-muted-foreground">
          See you at the top!
        </span>
      </button>

      <div className="flex items-center gap-2">
        <div ref={navRef} className="relative">
          <Button
            variant="ghost"
            size="icon"
            aria-haspopup="menu"
            aria-expanded={navOpen}
            aria-label="Menu"
            onClick={() => {
              setNavOpen((v) => !v);
              setAcctOpen(false);
            }}
          >
            <Menu aria-hidden />
          </Button>
          {navOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 z-20 w-52 overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg"
            >
              <NavItem
                icon={HomeIcon}
                label="Home"
                active={current === "home"}
                onClick={() => go("home")}
              />
              <NavItem
                icon={FileText}
                label="My Programs"
                active={current === "programs"}
                onClick={() => go("programs")}
              />
              <NavItem
                icon={Activity}
                label="My Progress"
                active={current === "progress"}
                onClick={() => go("progress")}
              />
            </div>
          )}
        </div>

        <div ref={acctRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={acctOpen}
            aria-label="Account"
            onClick={() => {
              setAcctOpen((v) => !v);
              setNavOpen(false);
            }}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="size-9 rounded-full flex-shrink-0"
              />
            ) : (
              <span
                aria-hidden
                className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
              >
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </button>
          {acctOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 z-20 w-64 overflow-hidden rounded-lg border border-border/60 bg-card shadow-lg"
            >
              <div className="flex items-center gap-2.5 border-b border-border/60 p-3">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-9 rounded-full flex-shrink-0"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold flex-shrink-0"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {user.name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAcctOpen(false);
                  onOpenSettings();
                }}
                className="flex w-full items-center gap-2 border-b border-border/60 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface2/60 focus-visible:outline-none focus-visible:bg-surface2/60"
              >
                <Settings aria-hidden className="size-4 text-muted-foreground" />
                Settings
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAcctOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground hover:bg-surface2/60 focus-visible:outline-none focus-visible:bg-surface2/60"
              >
                <LogOut aria-hidden className="size-4 text-muted-foreground" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Menu;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface2/60 focus-visible:outline-none focus-visible:bg-surface2/60 ${
        active ? "text-primary" : "text-foreground"
      }`}
    >
      <Icon
        aria-hidden
        className={`size-4 ${
          active ? "text-primary" : "text-muted-foreground"
        }`}
      />
      {label}
    </button>
  );
}
