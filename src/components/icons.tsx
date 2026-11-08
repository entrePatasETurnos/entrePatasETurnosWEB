/** Small inline stroke icons. Decorative by default (aria-hidden); pass a label to make one meaningful. */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Stroke({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function PawIcon({ size = 24, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
      <circle cx="6" cy="9" r="2.2" />
      <circle cx="10" cy="5.5" r="2.2" />
      <circle cx="14" cy="5.5" r="2.2" />
      <circle cx="18" cy="9" r="2.2" />
      <path d="M12 11c-3 0-6 3.6-6 6.2 0 1.8 1.4 2.8 3 2.8 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.6 0 3-1 3-2.8 0-2.6-3-6.2-6-6.2z" />
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9v12h14V9" />
    <path d="M10 21v-6h4v6" />
  </Stroke>
);

export const ScissorsIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="6" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M20 4 8.1 15.9" />
    <path d="M14.5 14.5 20 20" />
    <path d="M8.1 8.1 12 12" />
  </Stroke>
);

export const CapIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M22 10 12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
    <path d="M22 10v6" />
  </Stroke>
);

export const CheckIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </Stroke>
);

export const DoubleCheckIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M2 12.5 6.5 17 15 8.5" />
    <path d="M10 15.5 11.5 17 22 6.5" />
  </Stroke>
);

export const XIcon = (p: IconProps) => (
  <Stroke strokeWidth={2.4} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
);

export const CalendarIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Stroke>
);

export const UserIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </Stroke>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </Stroke>
);

export const LogOutIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Stroke>
);

export const ChatIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Stroke>
);

export const ClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Stroke>
);
