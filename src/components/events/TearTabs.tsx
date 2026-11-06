import { useState } from 'react'
import { tabsRemaining } from '../../lib/eventState'

interface TearTabsProps {
  spotsLeft: number
  capacity: number
  /** Printed sideways on each tab, as on a real flyer. */
  text: string
  count?: number
  className?: string
}

/**
 * The tabs at the bottom of a flyer. Hidden from screen readers because the
 * availability sentence next to them says the same thing in words.
 */
export function TearTabs({ spotsLeft, capacity, text, count = 10, className = '' }: TearTabsProps) {
  const attached = tabsRemaining(spotsLeft, capacity, count)
  // Remember the count from before a change, so only newly torn tabs animate.
  const [seen, setSeen] = useState(attached)
  const [tearFrom, setTearFrom] = useState(attached)
  if (attached !== seen) {
    setSeen(attached)
    setTearFrom(Math.max(attached, seen))
  }

  return (
    <div aria-hidden className={`tabs ${className}`}>
      {Array.from({ length: count }, (_, index) => {
        const torn = index >= attached
        const tearing = torn && index < tearFrom
        return (
          <span
            key={index}
            className={`tab ${torn ? 'tab-torn' : ''} ${tearing ? 'tab-tearing' : ''}`}
          >
            {text}
          </span>
        )
      })}
    </div>
  )
}
