import type { ReactNode } from 'react'

/** Ícones vetoriais canônicos do CAPO: não dependem das fontes emoji do dispositivo. */
export type CapoIconName = 'person' | 'people' | 'calendar' | 'clock' | 'search' | 'list' | 'file' | 'truck' | 'check' | 'cake' | 'settings' | 'coffee' | 'meal' | 'book' | 'monitor' | 'clipboard' | 'chart' | 'block' | 'medical' | 'message' | 'activity'

const shapes: Record<CapoIconName, ReactNode> = {
  person: <><circle cx="12" cy="8" r="3.5"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2"/><path d="M16 5a3 3 0 0 1 0 6m1 3a5 5 0 0 1 4 5v1"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  list: <><path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" strokeWidth="3" strokeLinecap="round"/></>,
  file: <><path d="M6 2h8l5 5v15H6zM14 2v6h5M9 12h7M9 16h7"/></>,
  truck: <><path d="M2 6h12v12H2zM14 10h4l4 4v4h-8z"/><circle cx="6.5" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></>,
  cake: <><path d="M3 12h18v9H3zM3 16h18M7 8v4m5-4v4m5-4v4"/><path d="M7 4v2m5-2v2m5-2v2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>,
  coffee: <><path d="M4 7h14v7a7 7 0 0 1-14 0zM18 8h2a3 3 0 0 1 0 6h-2M3 21h17M8 3v2m5-2v2"/></>,
  meal: <><path d="M4 3v7m3-7v7M2 3v5a4 4 0 0 0 7 0V3M6 10v11M17 3v18M17 3c-4 3-5 8 0 10"/></>,
  book: <><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1zM12 5v15"/></>,
  monitor: <><rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/></>,
  clipboard: <><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6m-6 4h6"/></>,
  chart: <><path d="M3 21h18M6 17v-5m6 5V7m6 10V3"/></>,
  block: <><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></>,
  medical: <><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/></>,
  message: <><path d="M4 4h16v13H9l-5 4z"/><path d="M8 9h8m-8 4h5"/></>,
  activity: <><path d="M2 12h5l3-7 4 14 3-7h5"/></>,
}

export function CapoIcon({ name, size = 18, className }: Readonly<{
  name: CapoIconName; size?: number; className?: string
}>) {
  return <svg className={className} aria-hidden="true" focusable="false" width={size} height={size}
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ display: 'inline-block', verticalAlign: '-0.2em', flexShrink: 0 }}>
    {shapes[name]}
  </svg>
}
