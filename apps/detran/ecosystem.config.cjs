// PM2 — servidor DETRAN em segundo plano, com baixo consumo de RAM.
//   npm run build:prod && pm2 start ecosystem.config.cjs && pm2 save
// (build:prod gera a interface em ./dist e o servidor compilado em ./dist-server)
module.exports = {
  apps: [
    {
      name: 'detran',
      // Servidor já compilado: roda em Node puro, sem o tsx (economiza ~30 MB de RAM).
      script: 'dist-server/index.mjs',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        // Teto do heap do V8: o coletor de lixo trabalha mais cedo e o app não incha.
        NODE_OPTIONS: '--max-old-space-size=192',
      },
      // Reinicia se o próprio Node passar de 350 MB (o Chromium é filho e fecha sozinho).
      max_memory_restart: '350M',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      windowsHide: true,
    },
  ],
}
