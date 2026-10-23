import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'plus'
  | 'settings'
  | 'search'
  | 'copy'
  | 'qr'
  | 'share'
  | 'trash'
  | 'star'
  | 'chevronLeft'
  | 'check'
  | 'x'
  | 'sun'
  | 'moon'
  | 'globe'
  | 'scan'
  | 'download'
  | 'upload'
  | 'server'
  | 'shield'
  | 'zap'
  | 'external'
  | 'edit'
  | 'info'
  | 'alert'
  | 'eye'
  | 'eyeOff'
  | 'wifi'
  | 'list'
  | 'telegram'
  | 'github';

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="10" cy="17" r="2.2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M15.5 6.5v-1a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h1" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5" />
      <path d="M14 14h2.5v2.5H14z" />
      <path d="M20.5 14v2.5M14 20.5h2.5M20.5 20.5v.01" />
    </>
  ),
  share: (
    <>
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.8h5V7" />
      <path d="m6.5 7 1 12.2a1.8 1.8 0 0 0 1.8 1.8h5.4a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
    </>
  ),
  star: <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20.5 14.3A8.6 8.6 0 0 1 9.7 3.5a8.6 8.6 0 1 0 10.8 10.8z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5s1.2-6.2 3.6-8.5z" />
    </>
  ),
  scan: (
    <>
      <path d="M4 8.5V6a2 2 0 0 1 2-2h2.5" />
      <path d="M15.5 4H18a2 2 0 0 1 2 2v2.5" />
      <path d="M20 15.5V18a2 2 0 0 1-2 2h-2.5" />
      <path d="M8.5 20H6a2 2 0 0 1-2-2v-2.5" />
      <path d="M4 12h16" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11" />
      <path d="m7.5 11 4.5 4.5L16.5 11" />
      <path d="M5 20h14" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M5 20h14" />
    </>
  ),
  server: (
    <>
      <rect x="3.5" y="4" width="17" height="6.5" rx="2" />
      <rect x="3.5" y="13.5" width="17" height="6.5" rx="2" />
      <path d="M7 7.2h.01M7 16.7h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.2 19 6v5.6c0 4.4-2.9 7.3-7 9.2-4.1-1.9-7-4.8-7-9.2V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  zap: <path d="M13.5 2.5 4.5 14h6l-1 7.5L19.5 10h-6z" />,
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m14.5 5.5 4 4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4 3.5 19h17z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2.8 12S6.5 5.8 12 5.8 21.2 12 21.2 12 17.5 18.2 12 18.2 2.8 12 2.8 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.6 5.9A9.4 9.4 0 0 1 12 5.6c5.5 0 9.2 6.2 9.2 6.2a17 17 0 0 1-3 3.7" />
      <path d="M6.3 8.3A17 17 0 0 0 2.8 12s3.7 6.2 9.2 6.2a9 9 0 0 0 3.3-.6" />
    </>
  ),
  wifi: (
    <>
      <path d="M3.5 9a13 13 0 0 1 17 0" />
      <path d="M6.5 12.4a8.5 8.5 0 0 1 11 0" />
      <path d="M9.5 15.8a4 4 0 0 1 5 0" />
      <path d="M12 19.2h.01" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  telegram: <path d="M21 4.5 2.8 11.3l5.4 1.9 1.7 5.4 2.9-3.6 4.1 3 1.2-8.6-6.3 3.5" />,
  github: (
    <path d="M9.2 20.5c-4 1.1-4-2-5.5-2.4m11.1 4.4v-3.4c0-1 .1-1.4-.5-2 2.3-.3 4.6-1.2 4.6-5.2a4.2 4.2 0 0 0-1.1-2.9 3.9 3.9 0 0 0-.1-2.9s-.9-.3-3 1.1a10.3 10.3 0 0 0-5.4 0C7.2 6.8 6.3 7.1 6.3 7.1a3.9 3.9 0 0 0-.1 2.9A4.2 4.2 0 0 0 5.1 13c0 3.9 2.3 4.9 4.6 5.2-.4.4-.5 1.1-.5 2v3.4" />
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
}

export function Icon({ name, size = 20, className, style, filled = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0.8 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
