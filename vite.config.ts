import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { exec } from 'child_process'

const devGitPullPlugin = (): Plugin => ({
  name: 'resume-dev-git-pull',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__dev__/git-pull', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }))
        return
      }

      exec('git pull', { cwd: process.cwd(), timeout: 60_000 }, (error, stdout, stderr) => {
        res.setHeader('Content-Type', 'application/json')

        if (error) {
          res.statusCode = 500
          res.end(JSON.stringify({
            success: false,
            error: error.message,
            stdout,
            stderr
          }))
          return
        }

        res.statusCode = 200
        res.end(JSON.stringify({
          success: true,
          stdout,
          stderr
        }))
      })
    })
  }
})

export default defineConfig({
  plugins: [vue(), devGitPullPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000
  }
})
