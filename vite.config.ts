import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * Turns VITE_BASE_PATH into the form Vite expects: a leading and trailing
 * slash. "my-repo", "/my-repo" and "/my-repo/" all become "/my-repo/".
 * An empty value means the site is served from the domain root.
 */
function normalizeBasePath(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/^\/+|\/+$/g, '')
  return trimmed ? `/${trimmed}/` : '/'
}

/**
 * GitHub Pages has no server-side routing, so opening /my-repo/events/42
 * directly would return its 404 page. Serving the app as that 404 page lets
 * React Router take over and show the right screen.
 */
function spaFallback(): Plugin {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist')
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: normalizeBasePath(env.VITE_BASE_PATH),
    plugins: [react(), tailwindcss(), spaFallback()],
    test: { environment: 'node' },
  }
})
