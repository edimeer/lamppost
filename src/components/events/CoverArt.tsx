import { useState } from 'react'
import type { EventDetails } from '../../data/types'
import { resolveAssetUrl } from '../../lib/url'
import { FlyerArt } from './FlyerArt'

type CoverEvent = Pick<EventDetails, 'id' | 'category' | 'coverImageUrl' | 'coverImageAlt'>

/** Shows the cover image, and quietly swaps in poster art if it is missing or fails. */
export function CoverArt({ event }: { event: CoverEvent }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = event.coverImageUrl

  if (!url || failedUrl === url) {
    return <FlyerArt category={event.category} seed={event.id} />
  }
  return (
    <img
      src={resolveAssetUrl(url)}
      alt={event.coverImageAlt ?? ''}
      loading="lazy"
      className="block size-full object-cover"
      onError={() => setFailedUrl(url)}
    />
  )
}
