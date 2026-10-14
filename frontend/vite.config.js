import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: '../docs/test-evidence/frontend-coverage',
      include: ['src/App.jsx', 'src/api/client.js', 'src/pages/*.jsx', 'src/components/{BookingModal,BookingSchedule,CurrentBookings,HomeDashboard,CalendarPicker,CourtImage}.jsx'],
      exclude: ['src/pages/AuthLayout.jsx'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  }
})
