📦 Updating system packages...
[Output from apt update and apt upgrade, e.g., "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease", followed by package upgrades]

🧰 Installing dependencies...
[Output from apt install, e.g., "Reading package lists... Done", "The following NEW packages will be installed: curl build-essential", followed by installation progress]

📥 Installing NVM...
[Output from curl and NVM install script, e.g., "=> Downloading nvm from git to '/home/user/.nvm'", "=> Profile updated to include NVM"]

✅ NVM installed: 0.39.7

📦 Setting up Node.js LTS...
[Output from nvm install --lts, e.g., "Downloading and installing node v18.17.0...", "Now using node v18.17.0 (npm v9.6.7)"]

✅ Node installed: v18.17.0
✅ npm installed: 9.6.7

🧪 Verifying setup...
/home/user/.nvm/versions/node/v18.17.0/bin/node
/home/user/.nvm/versions/node/v18.17.0/bin/npm

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


✅ Node.js environment ready! 