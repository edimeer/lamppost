import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { TimeZoneProvider } from './context/TimeZoneProvider'
import { ToastProvider } from './context/ToastProvider'
import { refreshFromStorage } from './data'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: false, refetchOnWindowFocus: false },
  },
})

// Keep open tabs in step: this fires when another tab writes to localStorage.
window.addEventListener('storage', () => {
  refreshFromStorage()
  void queryClient.invalidateQueries()
})

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TimeZoneProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </TimeZoneProvider>
    </QueryClientProvider>
  </StrictMode>,
)
