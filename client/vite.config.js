import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 只把 react 运行时固定成独立 chunk（几乎永不变化，可长期命中长缓存）；
        // antd 交给 Rollup 按「谁真正用到」自动分配：总览只用 Card/Row 等少数组件，
        // 把 antd 整包钉成一个 chunk 会让首屏把一个多余的 1MB 全拖下来。
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react';
          return undefined;
        },
      },
    },
  },
});