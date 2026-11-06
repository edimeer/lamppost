import { Link } from 'react-router'
import { EmptyState } from '../components/ui/States'
import { usePageTitle } from '../lib/usePageTitle'

export function NotFoundPage() {
  usePageTitle('Page not found')
  return (
    <div className="wrap py-14">
      <EmptyState
        title="This page is not on the board"
        action={
          <Link to="/" className="btn btn-primary">
            Browse events
          </Link>
        }
      >
        The link may be old or mistyped.
      </EmptyState>
    </div>
  )
}
