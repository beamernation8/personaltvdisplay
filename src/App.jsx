import React from 'react'
import HeaderWidget from './components/HeaderWidget.jsx'
import CalendarWidget from './components/CalendarWidget.jsx'
import EmailWidget from './components/EmailWidget.jsx'
import SabresWidget from './components/SabresWidget.jsx'
import NewsWidget from './components/NewsWidget.jsx'
import AuthPill from './components/AuthPill.jsx'

/**
 * Fixed 16:9 dashboard. The whole UI is sized to the viewport with CSS Grid
 * — no scrollbars, no overflow, designed to live on a TV screen forever.
 *
 * Grid (12 cols × 6 rows):
 *  ┌──────────────────────────────────────────────────────────────┐
 *  │                       HEADER  (12 × 1)                       │
 *  ├──────────────────────────────┬───────────────────────────────┤
 *  │                              │                               │
 *  │      CALENDAR  (7 × 3)       │       SABRES  (5 × 3)         │
 *  │                              │                               │
 *  ├──────────────────────────────┼───────────────────────────────┤
 *  │       EMAIL    (7 × 2)       │        NEWS   (5 × 2)         │
 *  └──────────────────────────────┴───────────────────────────────┘
 */
export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden mesh-bg">
      {/* Subtle vignette for premium TV feel */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      <main
        className="relative z-10 grid h-full w-full gap-5 p-6
                   grid-cols-12 grid-rows-6"
      >
        <section className="col-span-12 row-span-1 animate-fade-in">
          <HeaderWidget />
        </section>

        <section
          className="col-span-7 row-span-3 animate-fade-in"
          style={{ animationDelay: '80ms' }}
        >
          <CalendarWidget />
        </section>

        <section
          className="col-span-5 row-span-3 animate-fade-in"
          style={{ animationDelay: '160ms' }}
        >
          <SabresWidget />
        </section>

        <section
          className="col-span-7 row-span-2 animate-fade-in"
          style={{ animationDelay: '240ms' }}
        >
          <EmailWidget />
        </section>

        <section
          className="col-span-5 row-span-2 animate-fade-in"
          style={{ animationDelay: '320ms' }}
        >
          <NewsWidget />
        </section>
      </main>

      <AuthPill />
    </div>
  )
}
