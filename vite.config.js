import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'node:https'
import dns from 'node:dns'

// Some Windows setups resolve api-web.nhle.com to an unreachable IPv6
// address first, causing ETIMEDOUT. Force IPv4 for outbound proxy calls.
dns.setDefaultResultOrder('ipv4first')

const nhlProxy = {
  '/api/nhl': {
    target: 'https://api-web.nhle.com',
    changeOrigin: true,
    secure: true,
    rewrite: (p) => p.replace(/^\/api\/nhl/, ''),
    agent: new https.Agent({ family: 4, keepAlive: true })
  }
}

export default defineConfig({
  plugins: [react()],
  server:  { port: 5173, proxy: nhlProxy },
  preview: { port: 4173, proxy: nhlProxy }
})
