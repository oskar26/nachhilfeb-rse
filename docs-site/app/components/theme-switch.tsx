import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'fumadocs-ui/provider/base';

const subscribe = () => () => {};

function applyTheme(next: 'light' | 'dark', setTheme: (theme: string) => void) {
  const canAnimate =
    typeof document.startViewTransition === 'function' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canAnimate) {
    setTheme(next);
    return;
  }

  document.startViewTransition(() => flushSync(() => setTheme(next)));
}

/**
 * A single, labeled light/dark toggle. Fumadocs' built-in switch renders two
 * tiny icons inside one button; this version gives the control a 44px target,
 * exposes the current state via `aria-pressed`, and skips the view transition
 * when reduced motion is requested.
 */
export function DocsThemeSwitch({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === 'dark';
  const label = isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln';

  return (
    <button
      type="button"
      data-theme-toggle=""
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className={['docs-theme-switch', className].filter(Boolean).join(' ')}
      onClick={() => applyTheme(isDark ? 'light' : 'dark', setTheme)}
    >
      {isDark ? (
        <Moon aria-hidden="true" className="size-5" strokeWidth={2} />
      ) : (
        <Sun aria-hidden="true" className="size-5" strokeWidth={2} />
      )}
    </button>
  );
}
