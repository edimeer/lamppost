import { useId, type ReactNode } from 'react'
import type { EventCategory } from '../../data/types'
import { hashString } from './categoryStyle'

const INK = '#2438b8'
const PINK = '#ff5c8a'
const SUN = '#ffc93c'
const multiply = { mixBlendMode: 'multiply' as const }

/** Two-ink poster shapes for each category. n varies them per event. */
const MOTIFS: Record<EventCategory, (n: number) => ReactNode> = {
  music: (n) => (
    <>
      {[120, 90, 60, 30].map((r) => (
        <circle key={r} cx={70 + (n % 170)} cy="180" r={r} fill="none" stroke={INK} strokeWidth="12" />
      ))}
      <circle cx="250" cy="60" r="20" fill={PINK} style={multiply} />
      <rect x="264" y="10" width="7" height="52" fill={INK} />
      <circle cx="200" cy="44" r="14" fill={PINK} style={multiply} />
      <rect x="208" y="4" width="6" height="40" fill={INK} />
    </>
  ),
  food: (n) => (
    <>
      <circle cx="96" cy="108" r="58" fill={PINK} style={multiply} />
      <circle cx={170 + (n % 30)} cy="94" r="50" fill={SUN} style={multiply} />
      <circle cx="244" cy="118" r="44" fill={INK} style={multiply} />
      <path d="M96 52c6-20 24-30 42-30-2 20-20 32-42 30z" fill={INK} />
    </>
  ),
  arts: (n) => (
    <>
      <path d="M38 132c28-74 86-110 124-82s18 74 62 56 56-54 72-40-10 96-82 110-204 26-176-44z" fill={PINK} style={multiply} />
      <path
        d={`M16 ${70 + (n % 30)}l36-34 34 40 36-46 36 44 36-42 36 46 36-40 34 36`}
        fill="none"
        stroke={INK}
        strokeWidth="11"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </>
  ),
  outdoors: (n) => (
    <>
      <circle cx={210 + (n % 70)} cy="58" r="36" fill={SUN} />
      <path d="M-10 180 92 44l70 92 44-50 124 94z" fill={INK} />
      <path d="M92 44 62 84l22-6 14 12 18-14 16 10z" fill="#fff" />
      <path d="M-10 180c70-44 150-44 340 0z" fill={PINK} style={multiply} />
    </>
  ),
  family: (n) => (
    <>
      <path d="M170 16l66 62-66 62-66-62z" fill={PINK} style={multiply} />
      <path d="M170 16v124M104 78h132" stroke={INK} strokeWidth="6" />
      <path
        d={`M170 140c-20 16 16 22-6 40M${70 + (n % 30)} 180c10-30 30-40 34-60`}
        stroke={INK}
        strokeWidth="5"
        fill="none"
      />
      <circle cx="62" cy="52" r="24" fill={SUN} />
      <circle cx="280" cy="120" r="30" fill={INK} style={multiply} />
    </>
  ),
  learning: (n) => (
    <>
      <path d="M160 58c-34-24-82-26-122-14v110c40-12 88-10 122 14 34-24 82-26 122-14V44c-40-12-88-10-122 14z" fill="#fff" />
      <path d="M160 58c-34-24-82-26-122-14v110c40-12 88-10 122 14z" fill={PINK} style={multiply} />
      <path d="M160 58v110" stroke={INK} strokeWidth="7" />
      {[0, 1, 2].map((line) => (
        <path
          key={line}
          d={`M${184} ${80 + line * 22}c24-6 50-6 ${64 - (n % 16)}-2`}
          stroke={INK}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </>
  ),
  volunteering: (n) => (
    <>
      <path d="M160 160C60 104 52 34 104 26c28-4 48 16 56 38 8-22 28-42 56-38 52 8 44 78-56 134z" fill={PINK} style={multiply} />
      <circle cx={60 + (n % 30)} cy="140" r="24" fill={SUN} style={multiply} />
      <circle cx="270" cy="42" r="20" fill={INK} style={multiply} />
    </>
  ),
  wellness: (n) => (
    <>
      <circle cx={160 + (n % 60)} cy="66" r="44" fill={SUN} />
      {[0, 1, 2, 3].map((row) => (
        <path
          key={row}
          d={`M-10 ${92 + row * 26}q40-30 80 0t80 0 80 0 80 0 80 0`}
          fill="none"
          stroke={row % 2 ? PINK : INK}
          strokeWidth="11"
          style={row % 2 ? multiply : undefined}
        />
      ))}
    </>
  ),
  neighborhood: (n) => (
    <>
      <path d="M12 180V94l50-38 50 38v86z" fill={PINK} style={multiply} />
      <path d="M96 180V76l58-46 58 46v104z" fill={INK} />
      <path d="M198 180v-80l52-40 52 40v80z" fill={SUN} style={multiply} />
      <rect x="138" y="128" width="30" height="52" fill="#fff" />
      <rect x="46" y={110 + (n % 10)} width="24" height="24" fill="#fff" />
      <rect x="238" y={112 + (n % 8)} width="24" height="24" fill="#fff" />
    </>
  ),
}

/** The poster art shown when an event has no cover image, or its image fails. */
export function FlyerArt({ category, seed }: { category: EventCategory; seed: string }) {
  const patternId = useId()
  const n = hashString(seed)
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className="block size-full"
    >
      <defs>
        <pattern id={patternId} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <circle cx="4.5" cy="4.5" r="1.7" fill={INK} opacity="0.3" />
        </pattern>
      </defs>
      <rect width="320" height="180" fill={`url(#${patternId})`} />
      {MOTIFS[category](n)}
    </svg>
  )
}
