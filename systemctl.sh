[Unit]
Description=Tecnibo Next.js Application
After=network.target
StartLimitIntervalSec=60
StartLimitBurst=10

[Service]
User=yattaoui
WorkingDirectory=/home/yattaoui/tecnipo-2d-3d
ExecStart=/usr/bin/bash -c 'cd /home/yattaoui/tecnipo-2d-3d && export PATH="$PATH:/home/yattaoui/.nvm/versions/node/v20.13.1/bin:$PATH" && npm run build && npm start'
RestartSec=3
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target