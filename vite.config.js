import {defineConfig} from 'vite';
export default defineConfig({
  server: {watch: {usePolling: true, interval: 200}} // /mnt/c (WSL) doesn't deliver fs events
});
