import { sveltekit } from '@sveltejs/kit/vite';

export default {
  server: {
    host: '127.0.0.1',
    port: 5174,
  },
  plugins: await sveltekit(),
};
