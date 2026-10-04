import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ base: '/shinjuku/', plugins: [react()], server: { port: 5181 } });
