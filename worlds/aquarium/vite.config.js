import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({ base: '/aquarium/', plugins: [react()], server: { port: 5175 } });
