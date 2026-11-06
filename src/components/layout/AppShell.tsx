import { Bookmark, CalendarPlus, Compass, Globe, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  Link,
  NavLink,
  Outlet,
  ScrollRestoration,
  useLocation,
  useMatch,
  type Location,
} from 'react-router'
import { useTimeZone } from '../../context/timeZone'
import { repository } from '../../data'
import { formatZoneAbbreviation, formatZoneLabel, zoneCity } from '../../lib/format'

const NAV_ITEMS = [
  { to: '/', label: 'Discover', Icon: Compass, end: true },
  { to: '/plans', label: 'Your plans', Icon: Bookmark, end: false },
  { to: '/organize', label: 'Organize', Icon: CalendarPlus, end: false },
  { to: '/profile', label: 'Profile', Icon: UserRound, end: false },
]

/**
 * Every fresh page load gets the same history key, so restoring by key alone
 * would open a new link at the scroll position of a different page.
 */
function scrollKey(location: Location): string {
  return location.key === 'default' ? `${location.pathname}${location.search}` : location.key
}

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2 no-underline" aria-label="Lamppost home">
      <svg aria-hidden viewBox="0 0 32 32" className="size-9">
        <rect width="32" height="32" rx="7" fill="#2438b8" />
        <path d="M10 13 12.5 5h7L22 13z" fill="#ffc93c" />
        <rect x="9" y="12.5" width="14" height="2.5" rx="1" fill="#fff" />
        <rect x="14.75" y="15" width="2.5" height="11" fill="#fff" />
        <rect x="11" y="25" width="10" height="2.5" rx="1" fill="#fff" />
      </svg>
      <span className="font-display text-[1.625rem] leading-none">Lamppost</span>
    </Link>
  )
}

function TimeZoneButton() {
  const { timeZone, openPicker } = useTimeZone()
  const [now] = useState(() => new Date())
  return (
    <button
      type="button"
      onClick={openPicker}
      aria-label={`Times shown in ${formatZoneLabel(timeZone, now)}. Change time zone`}
      className="btn btn-ghost min-h-11 px-2 text-[0.9375rem] font-semibold no-underline"
    >
      <Globe aria-hidden className="size-5" />
      <span className="sm:hidden">{formatZoneAbbreviation(now.toISOString(), timeZone)}</span>
      <span className="hidden sm:inline">{zoneCity(timeZone)} time</span>
    </button>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const lastPathname = useRef(pathname)
  const onDetailPage = useMatch('/events/:id')

  // Single-page apps do not move focus on navigation, so do it for keyboard
  // and screen reader users, the way a full page load would.
  useEffect(() => {
    if (lastPathname.current === pathname) return
    lastPathname.current = pathname
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-board">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="bg-white text-ink">
        <div className="wrap flex min-h-16 items-center justify-between gap-3">
          <Wordmark />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `btn px-3 no-underline ${isActive ? 'bg-stock-butter' : 'hover:bg-paper'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <TimeZoneButton />
        </div>
      </header>

      {!repository.isPersistent() && (
        <p role="status" className="m-0 bg-stock-butter px-4 py-2 text-center font-semibold text-ink">
          Your browser is blocking storage, so changes will be lost when you close this tab.
        </p>
      )}

      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 text-white">
        <Outlet />
      </main>

      <footer className={`bg-board-deep text-white ${onDetailPage ? 'pb-24 md:pb-0' : 'pb-20 md:pb-0'}`}>
        <div className="wrap py-6 text-[0.9375rem]">
          <p className="m-0 max-w-2xl">
            Your events, RSVPs and saved flyers are stored in this browser only. Nothing is sent to
            a server.
          </p>
        </div>
      </footer>

      {!onDetailPage && (
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white pb-[env(safe-area-inset-bottom)] text-ink md:hidden"
        >
          <ul className="m-0 grid list-none grid-cols-4 p-0">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex min-h-16 flex-col items-center justify-center gap-0.5 text-[0.8125rem] font-semibold no-underline ${
                      isActive ? 'bg-stock-butter' : ''
                    }`
                  }
                >
                  <Icon aria-hidden className="size-6" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <ScrollRestoration getKey={scrollKey} />
    </div>
  )
}
