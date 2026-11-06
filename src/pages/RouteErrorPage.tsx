import { useRouteError } from 'react-router'
import { ErrorState } from '../components/ui/States'

/** Last line of defense if a screen crashes while rendering. */
export function RouteErrorPage() {
  const error = useRouteError()
  return (
    <div className="grid min-h-dvh place-items-center bg-board p-4">
      <ErrorState
        error={error}
        title="Something broke on this page"
        onRetry={() => window.location.reload()}
      />
    </div>
  )
}
