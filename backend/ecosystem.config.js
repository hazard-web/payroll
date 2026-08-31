require('dotenv').config()

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'people-os-api',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
