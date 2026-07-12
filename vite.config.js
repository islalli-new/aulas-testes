import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base precisa ser "/<nome-do-repo>/" pro GitHub Pages achar os arquivos.
// Em dev/local (Docker) usamos "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/aulas-testes/' : '/',
  plugins: [react()],
}))
