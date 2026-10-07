import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createChatHandler } from './api/chat.js';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      react(),
      {
        name: 'local-study-chat',
        configureServer(server) {
          const handler = createChatHandler({ env });
          server.middlewares.use('/api/chat', async (req, res) => {
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (value) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(value));
            };
            await handler(req, res);
          });
        },
      },
    ],
  };
});
