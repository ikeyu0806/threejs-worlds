import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ base: '/heian/', plugins: [react()], server: { port: 5178 } });
