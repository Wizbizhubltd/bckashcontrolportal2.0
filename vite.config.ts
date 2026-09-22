import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Fixed (not Vite's auto-incrementing default) so it doesn't collide with BCKashWebClient
  // (5173, or 5174 if 5173 was already taken) when both run side by side — and so the
  // backend's CORS allow-list can name it exactly.
  server: {
    port: 5180,
    // Without this, Vite silently falls back to the next free port when 5180 is taken — which
    // then fails CORS against the backend's allow-list in a much more confusing way than just
    // refusing to start.
    strictPort: true,
  },
})
