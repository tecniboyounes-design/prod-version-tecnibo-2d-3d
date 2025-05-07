#!/bin/bash

# =============================
# 🚀 Node.js + npm Setup on Ubuntu 22.04+ 
# Author: Otman  
# Date: $(date +%Y-%m-%d)
# Description:
#   This script installs NVM, Node.js (LTS), and npm using safe and modern practices.
# chmod +x sys_info.sh
#   It ensures the latest versions are installed and verifies the setup
# ============================


# ssh yattaoui@192.168.30.92
# Yattaou1


# Get-Process | ForEach-Object { Stop-Process -Id $_.Id -Force }
# sudo nano /etc/systemd/system/tecnipo.service
# sudo systemctl status tecnipo.service // for check the status
# sudo systemctl start tecnipo.service // for start the service
# sudo systemctl stop tecnipo.service // for stop the service
# sudo systemctl restart tecnipo.service // for restart the service
# journalctl -u tecnipo.service -b -e 
# sudo journalctl -u tecnipo.service --since "10 minutes ago"



set -e  # Exit on error

echo "📦 Updating system packages..."
sudo apt update -y && sudo apt upgrade -y

echo "🧰 Installing dependencies..."
sudo apt install curl build-essential -y

if [ -d "$HOME/.nvm" ]; then
  echo "✅ NVM is already installed."
else
  echo "📥 Installing NVM..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash || { echo "❌ Failed to install NVM"; exit 1; }
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "✅ NVM installed: $(nvm --version)"

# Phase 2: Install Node.js LTS
echo "📦 Setting up Node.js LTS..."
LTS_VERSION=$(nvm ls-remote --lts | tail -n1 | awk '{print $2}')
if nvm ls "$LTS_VERSION" > /dev/null 2>&1; then
  echo "✅ Node.js $LTS_VERSION already installed."
else
  nvm install --lts
fi

nvm use --lts
nvm alias default 'lts/*'
 
echo "✅ Node installed: $(node -v)"
echo "✅ npm installed: $(npm -v)"

# Verification
echo "🧪 Verifying setup..."
which node
which npm

# Docs & Notes
cat <<'EOF'

📘 Docs & Usage Notes:
-------------------------------------
✔ Node.js LTS is recommended for Next.js 14 (requires Node.js 18+).
✔ Ensure `source ~/.nvm/nvm.sh` is in your shell profile (e.g., ~/.bashrc).
✔ Use `nvm install <version>` to switch Node versions.
✔ Use `nvm alias default <version>` to set a default version.

💡 Example:
   nvm install 20
   nvm use 20
   nvm alias default 20

EOF

echo "✅ Node.js environment ready!"