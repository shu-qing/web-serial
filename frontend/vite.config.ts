import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
  build: {
    // 代码分割优化
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // 状态管理
          'store': ['zustand'],
          // UI 组件库
          'ui-vendor': ['@headlessui/react', '@heroicons/react'],
          // 国际化
          'i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          // Markdown 编辑器
          'markdown': ['react-markdown', 'markdown-it', 'react-markdown-editor-lite'],
          // 工具库
          'utils': ['axios', 'date-fns', 'clsx'],
        },
      },
    },
    // 提高警告阈值
    chunkSizeWarningLimit: 1000,
    // 使用默认的 esbuild 压缩（更快）
    minify: 'esbuild',
  },
})

