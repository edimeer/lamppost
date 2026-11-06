/** Sample cover images are stored relative to the site, so add the base path. */
export function resolveAssetUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${import.meta.env.BASE_URL}${url}`
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}
