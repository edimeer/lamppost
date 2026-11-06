import { useEffect } from 'react'

export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} | Lamppost` : 'Lamppost: local events near you'
  }, [title])
}
