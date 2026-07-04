/* App icons: thin stroke (1.6), currentColor, viewBox 24. */

export type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  "aria-hidden": true,
} as const;

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function IconGauge({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 14a8 8 0 0 1 16 0" {...stroke} />
      <path d="M4 14h2M18 14h2M12 6V4M6.3 8.3 4.9 6.9M17.7 8.3l1.4-1.4" {...stroke} />
      <path d="m12 14 3.2-3" {...stroke} />
    </svg>
  );
}

export function IconColumns({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="5" height="16" rx="1.4" {...stroke} />
      <rect x="9.5" y="4" width="5" height="11" rx="1.4" {...stroke} />
      <rect x="16" y="4" width="5" height="16" rx="1.4" {...stroke} />
    </svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="8" r="3.2" {...stroke} />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...stroke} />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 19a5.5 5.5 0 0 0-2-4.2" {...stroke} />
    </svg>
  );
}

export function IconBell({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z" {...stroke} />
      <path d="M10.2 19a2 2 0 0 0 3.6 0" {...stroke} />
    </svg>
  );
}

export function IconPhone({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7.2 4.8 9.5 4a1.5 1.5 0 0 1 1.8.8l1 2.4a1.6 1.6 0 0 1-.4 1.8l-1.2 1.1a11.2 11.2 0 0 0 3.2 3.2l1.1-1.2a1.6 1.6 0 0 1 1.8-.4l2.4 1a1.5 1.5 0 0 1 .8 1.8l-.8 2.3a2.2 2.2 0 0 1-2.3 1.5C10.5 17.7 6.3 13.5 5.7 7.1a2.2 2.2 0 0 1 1.5-2.3Z" {...stroke} />
    </svg>
  );
}

export function IconBot({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="7.5" width="14" height="11" rx="2.4" {...stroke} />
      <path d="M12 7.5V4.5" {...stroke} />
      <path d="M8.5 13h.1M15.4 13h.1" {...stroke} />
      <path d="M9.5 16h5" {...stroke} />
      <path d="M3.5 12.5v2M20.5 12.5v2" {...stroke} />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="10.5" cy="10.5" r="5.7" {...stroke} />
      <path d="m15 15 4.5 4.5" {...stroke} />
    </svg>
  );
}

export function IconMessage({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4.8 4v-4A2.5 2.5 0 0 1 5 12.5v-6Z" {...stroke} />
      <path d="M8.5 9.5h7M8.5 12h4.5" {...stroke} />
    </svg>
  );
}

export function IconMic({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="8.2" y="3.8" width="7.6" height="11" rx="3.8" {...stroke} />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.2M8.8 20.2h6.4" {...stroke} />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCheckCircle({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.4" {...stroke} />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.8" {...stroke} />
    </svg>
  );
}

export function IconClock({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.4" {...stroke} />
      <path d="M12 7.6V12l3 1.8" {...stroke} />
    </svg>
  );
}

export function IconAlert({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4.5 21 19H3L12 4.5Z" {...stroke} />
      <path d="M12 10v3.4" {...stroke} />
      <circle cx="12" cy="16.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconWallet({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="6" width="17" height="13" rx="2.4" {...stroke} />
      <path d="M3.5 9.5h17" {...stroke} />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconArrowRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconArrowUpRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M7 17 17 7m0 0H8.5M17 7v8.5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}

export function IconTrash({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 7h15M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m2 0-.6 11a2 2 0 0 1-2 1.9H7.6a2 2 0 0 1-2-1.9L5 7" {...stroke} />
    </svg>
  );
}

export function IconX({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6 6 18" {...stroke} />
    </svg>
  );
}

export function IconSettings({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        {...stroke}
      />
      <path
        d="M19.4 13.5c.1-.5.1-1 0-1.5l1.6-1.3-1.6-2.7-1.9.6a5.6 5.6 0 0 0-1.3-.8l-.3-2H10.1l-.3 2c-.5.2-.9.5-1.3.8l-1.9-.6-1.6 2.7 1.6 1.3c-.1.5-.1 1 0 1.5l-1.6 1.3 1.6 2.7 1.9-.6c.4.3.8.6 1.3.8l.3 2h3.8l.3-2c.5-.2.9-.5 1.3-.8l1.9.6 1.6-2.7-1.6-1.3Z"
        {...stroke}
      />
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m9.5 6 6 6-6 6" {...stroke} />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17" {...stroke} />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" {...stroke} />
    </svg>
  );
}

export function IconGrip({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="9" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="17" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="17" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
