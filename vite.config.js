import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 9000,
    proxy: {
      '/api': {
        target: 'https://7e6098941.xuejingjie089.olares.cn/',
        changeOrigin: true,
        
      }
    }
  }
});