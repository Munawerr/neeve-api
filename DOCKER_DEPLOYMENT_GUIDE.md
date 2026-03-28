# Neeve Deployment Guide

Complete guide for deploying **neeve-web** (React/Vite) and **neeve-api** (NestJS) to an Ace Cloud VM using GitHub Actions and Docker.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Prepare Your Ace Cloud VM](#step-1--prepare-your-ace-cloud-vm)
4. [Step 2 — Configure GitHub Secrets](#step-2--configure-github-secrets)
5. [Step 3 — Prepare the VM Deployment Files](#step-3--prepare-the-vm-deployment-files)
6. [Step 4 — Configure the GitHub Repository Environment](#step-4--configure-the-github-repository-environment)
7. [Step 5 — Trigger Your First Deployment](#step-5--trigger-your-first-deployment)
8. [Networking & Port Reference](#networking--port-reference)
9. [HTTPS / TLS with Let's Encrypt](#https--tls-with-lets-encrypt)
10. [Dockerfile Notes & Modifications](#dockerfile-notes--modifications)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
GitHub push → main
       │
       ▼
GitHub Actions (ubuntu-latest)
  ├── Build neeve-web  → ghcr.io/<owner>/neeve-web:latest
  └── Build neeve-api  → ghcr.io/<owner>/neeve-api:latest
       │
       ▼
SSH into Ace Cloud VM
  └── docker compose pull + up -d
       ├── neeve-web  (Nginx)  → :80  (→ :443 after TLS setup)
       └── neeve-api  (Node)   → :3000
```

All services run in a shared `neeve-network` Docker bridge network so the API is reachable from the frontend container by hostname `neeve-api`.

---

## Prerequisites

| Tool | Where |
|------|--------|
| Docker Engine 24+ | Ace Cloud VM |
| Docker Compose v2 | Ace Cloud VM (bundled with Docker Engine) |
| Git | GitHub monorepo with `neeve-web/` and `neeve-api/` at root |
| GitHub account | Repository → Settings → Secrets |

---

## Step 1 — Prepare Your Ace Cloud VM

### 1.1 Create a VM

1. Log in to [acecloud.ai](https://acecloud.ai) and go to **Compute → Virtual Machines**.
2. Create a new VM:
   - **OS**: Ubuntu 22.04 LTS
   - **Size**: At minimum 2 vCPU / 4 GB RAM (the NestJS build requires ~2 GB during CI)
3. Note the **public IP address** — you will need it as `ACE_CLOUD_HOST`.

### 1.2 Open Firewall Ports

In the Ace Cloud Dashboard → **Security Groups** (or Firewall), add inbound rules:

| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH (GitHub Actions deployment) |
| 80 | TCP | React frontend (HTTP) |
| 443 | TCP | React frontend (HTTPS — needed after TLS setup) |
| 3000 | TCP | NestJS API |

> **Security note**: After initial setup, consider restricting port 22 to known IP ranges only (your office IP, GitHub Actions IP range) to reduce attack surface.

### 1.3 Install Docker on the VM

SSH into the VM and run:

```bash
# Install Docker Engine
curl -fsSL https://get.docker.com | bash

# Add your user to the docker group so you don't need sudo for docker commands
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 1.4 Create an SSH key pair for GitHub Actions

On the VM, generate a dedicated key pair for CI/CD:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""

# Add the public key to authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Print the private key — you'll paste this into GitHub Secrets
cat ~/.ssh/github_actions
```

---

## Step 2 — Configure GitHub Secrets

Go to your GitHub repository → **Settings → Secrets and variables → Actions → New repository secret**.

### Required Secrets

#### Deployment / SSH

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `ACE_CLOUD_HOST` | `123.45.67.89` | Public IP (or hostname) of your Ace Cloud VM |
| `ACE_CLOUD_USER` | `ubuntu` | SSH login username on the VM |
| `ACE_CLOUD_SSH_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Full content of `~/.ssh/github_actions` (private key) |
| `ACE_CLOUD_SSH_PORT` | `22` | SSH port (omit if default 22) |

#### Frontend Build Args (Vite bakes these in at build time)

| Secret Name | Example Value | Description |
|-------------|---------------|-------------|
| `VITE_API_URL` | `http://123.45.67.89:3000` | Full URL to your NestJS API as seen by browser clients |
| `VITE_SSO_COOKIE_DOMAIN` | `.yourdomain.com` | Cookie domain for SSO (use your domain or the VM IP) |

> **Important**: `VITE_*` variables are embedded into the compiled JavaScript bundle — treat any sensitive values accordingly. The API URL is not a secret per se, but storing it here keeps it environment-specific.

#### Backend Runtime Environment (goes into `/opt/neeve/.env` on the VM)

| Secret / Variable | Description |
|-------------------|-------------|
| `DB_URL` | MongoDB connection string (e.g. `mongodb+srv://user:pass@cluster.mongodb.net/neeve`) |
| `JWT_SECRET` | Random 64-character string — use `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `7d`) |
| `ADMIN_PASSWORD` | Initial admin user password |
| `OPENAI_API_KEY` | OpenAI API key |
| `MAIL_HOST` | SMTP hostname (e.g. `smtp.gmail.com`) |
| `MAIL_PORT` | SMTP port (`465` for SSL, `587` for STARTTLS) |
| `MAIL_USERNAME` | SMTP login username |
| `MAIL_PASSWORD` | SMTP app password |
| `DO_SPACES_KEY` | DigitalOcean Spaces key (optional) |
| `DO_SPACES_SECRET` | DigitalOcean Spaces secret (optional) |
| `DO_SPACES_ENDPOINT` | DO Spaces endpoint (optional) |
| `DO_SPACES_BUCKET` | DO Spaces bucket name (optional) |
| `DO_SPACES_ACL` | DO Spaces ACL (optional, e.g. `public-read`) |
| `AWS_S3_ACCESS_KEY` | AWS S3 access key (optional, if not using DO Spaces) |
| `AWS_S3_SECRET_ACCESS_KEY` | AWS S3 secret key (optional) |
| `AWS_S3_BUCKET_REGION` | AWS S3 region (optional) |
| `AWS_S3_BUCKET` | AWS S3 bucket name (optional) |
| `AWS_S3_BUCKET_ACL` | AWS S3 bucket ACL (optional) |
| `FAST2SMS_API_KEY` | Fast2SMS API key for OTP SMS (optional) |

> **Note**: The backend secrets are **not** GitHub Actions runtime secrets — they live on the VM as a `.env` file. Only `VITE_*` vars and SSH credentials need to be stored in GitHub Secrets.

---

## Step 3 — Prepare the VM Deployment Files

SSH into the Ace Cloud VM and set up the deployment directory:

```bash
# Create deployment directory
sudo mkdir -p /opt/neeve
sudo chown $USER:$USER /opt/neeve
```

### 3.1 Copy docker-compose.yml to the VM

From your local machine (or via `nano` on the VM), copy the `docker-compose.yml` from this repository to `/opt/neeve/docker-compose.yml`.

Using `scp`:
```bash
scp docker-compose.yml ubuntu@<ACE_CLOUD_HOST>:/opt/neeve/docker-compose.yml
```

### 3.2 Create the `.env` file on the VM

On the VM, create `/opt/neeve/.env` with all backend environment variables:

```bash
nano /opt/neeve/.env
```

Paste and fill in (replace placeholders):

```dotenv
# ── Docker image registry owner ───────────────────────────────────────────
GITHUB_OWNER=your-github-username-or-org

# ── MongoDB ───────────────────────────────────────────────────────────────
DB_URL=mongodb+srv://user:password@cluster.mongodb.net/neeve

# ── JWT ───────────────────────────────────────────────────────────────────
JWT_SECRET=replace-with-64-char-random-string
JWT_EXPIRES_IN=7d

# ── Auth ──────────────────────────────────────────────────────────────────
ADMIN_PASSWORD=your-secure-admin-password

# ── OpenAI ────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ── Mail / SMTP ───────────────────────────────────────────────────────────
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# ── Storage (fill ONE of the two options below) ───────────────────────────
# Option A: DigitalOcean Spaces
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=
DO_SPACES_BUCKET=
DO_SPACES_ACL=

# Option B: AWS S3
AWS_S3_ACCESS_KEY=
AWS_S3_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_REGION=
AWS_S3_BUCKET=
AWS_S3_BUCKET_ACL=

# ── SMS ───────────────────────────────────────────────────────────────────
FAST2SMS_API_KEY=
```

Secure the file:
```bash
chmod 600 /opt/neeve/.env
```

### 3.3 Authenticate Docker to GHCR on the VM (first-time only)

The GitHub Actions workflow logs in automatically on every deploy. But for the very first run or manual pulls, authenticate once:

```bash
# Create a GitHub PAT with read:packages scope at https://github.com/settings/tokens
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

---

## Step 4 — Configure the GitHub Repository Environment

1. Go to **Settings → Environments → New environment** and name it `production`.
2. Optionally add **Required reviewers** for protected deploys.
3. The workflow (`deploy.yml`) references `environment: production`, so GitHub will apply environment-level protections before the SSH step runs.

---

## Step 5 — Trigger Your First Deployment

```bash
git add .
git commit -m "chore: add Docker and CI/CD setup"
git push origin main
```

Watch the run under **Actions** in your GitHub repository.

**Expected flow:**
1. `Build & Push Images` job — ~5–10 min (first run; subsequent runs use layer cache).
2. `Deploy to Ace Cloud` job — ~1–2 min (SSH, pull, restart).

Once complete, visit:
- Frontend: `http://<ACE_CLOUD_HOST>`
- API docs: `http://<ACE_CLOUD_HOST>:3000/docs`

---

## Networking & Port Reference

| Service | Container port | Host port | Accessible at |
|---------|---------------|-----------|---------------|
| neeve-web (Nginx) | 80 | 80 | `http://<host>` |
| neeve-api (Node) | 3000 | 3000 | `http://<host>:3000` |

### Frontend → Backend communication

`VITE_API_URL` is the URL the **browser** uses to reach the API. Set it to:

```
http://<ACE_CLOUD_HOST>:3000
```

or, after adding a domain with reverse proxy:

```
https://api.yourdomain.com
```

> **CORS**: The NestJS app calls `app.enableCors()` without restrictions. For production, restrict allowed origins by updating [src/main.ts](neeve-api/src/main.ts):
> ```ts
> app.enableCors({ origin: process.env.ALLOWED_ORIGIN });
> ```

---

## HTTPS / TLS with Let's Encrypt

To serve the React app over HTTPS with a domain name:

### Option A: Certbot + Nginx on the host (recommended)

```bash
# Install certbot
sudo apt install -y certbot

# Stop the Docker nginx container temporarily (or use standalone mode)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Then mount the certificates into the `neeve-web` container and update [neeve-web/nginx.conf](neeve-web/nginx.conf) to listen on 443 with SSL. Add a second server block to redirect HTTP → HTTPS.

### Option B: Ace Cloud Load Balancer (easiest)

If Ace Cloud provides a managed Load Balancer / Application Gateway, terminate TLS there and route HTTP traffic internally to port 80 on the VM. No Nginx changes needed.

---

## Dockerfile Notes & Modifications

### neeve-web/Dockerfile

- Uses a **two-stage build**: Node 20 Alpine for Vite compilation, then Nginx 1.27 Alpine for serving.
- `VITE_API_URL` and `VITE_SSO_COOKIE_DOMAIN` are injected as Docker `ARG`s so they are embedded into the compiled JS bundle.
- Static assets are served with `Cache-Control: public, immutable` and 1-year `Expires` headers (Vite content-hashes filenames).
- React Router client-side routing is handled by `try_files $uri $uri/ /index.html`.

### neeve-api/Dockerfile

- Two-stage build: full `npm ci` + `nest build` in the builder stage, then only `npm ci --omit=dev` in the production image.
- Runs as a **non-root user** (`neeve`) for container security.
- Mail **Handlebars templates** (`src/mail/templates/*.hbs`) are copied from the build stage to `dist/mail/templates/` because `tsc` does not copy non-TypeScript files.

### nest-cli.json — Required Modification

The NestJS compiler does not automatically copy `.hbs` template files. Update [neeve-api/nest-cli.json](neeve-api/nest-cli.json) to include:

```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": [
      { "include": "mail/templates/**/*", "outDir": "dist" }
    ]
  }
}
```

This ensures `npm run build` copies templates to `dist/mail/templates/` so both the Dockerfile and local dev builds work correctly.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `docker login` fails on VM | PAT expired or missing `read:packages` scope | Generate a new PAT at GitHub Settings |
| Frontend loads but API calls fail (CORS/network) | `VITE_API_URL` points to `localhost` | Set `VITE_API_URL` in GitHub Secrets to the VM's public IP:3000 |
| Container crashes on start | Missing `.env` values | Check `/opt/neeve/.env` for blank required vars; run `docker compose logs neeve-api` |
| Emails not sending | Wrong SMTP credentials or port | Verify `MAIL_HOST`, `MAIL_PORT`, `secure` setting matches your provider |
| Templates not found error | `.hbs` files not in `dist/` | Apply the `nest-cli.json` asset fix above and rebuild |
| SSH: `Permission denied` | Wrong private key or user | Confirm `ACE_CLOUD_USER` matches the VM login and the public key is in `~/.ssh/authorized_keys` |
| Port 3000 unreachable | Firewall rule missing | Add inbound TCP 3000 rule in Ace Cloud Security Group |
