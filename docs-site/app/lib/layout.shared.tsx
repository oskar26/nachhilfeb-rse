import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: appName,
      children: (
        <a href="/" className="platform-cta">
          Zur Plattform
        </a>
      ),
    },
  };
}
