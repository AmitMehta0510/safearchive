# 🛡️ SafeArchive

> **Secure, Cloud-Backed Distributed Version Control & Developer Collaboration Platform**

SafeArchive is an end-to-end full-stack Git and GitHub alternative. It combines a lightweight, local distributed version control engine (CLI) with dual-storage cloud synchronization (AWS S3 for raw file artifacts + MongoDB for metadata and revision logs) and a modern, high-performance web collaboration platform (React 18 + Node.js + WebSockets).

---

## 🏗️ System Architecture

```
                                  ┌───────────────────────────┐
                                  │      SafeArchive CLI      │
                                  │ (init, add, commit, push) │
                                  └─────────────┬─────────────┘
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       │                                                 │
                       ▼                                                 ▼
        ┌─────────────────────────────┐                   ┌─────────────────────────────┐
        │        AWS S3 Vault         │                   │    Express + MongoDB API    │
        │  Raw file blobs & commits   │                   │  Metadata, branches, issues │
        │  commits/<commitID>/<files> │                   │  users, PATs & repo models  │
        └─────────────────────────────┘                   └──────────────┬──────────────┘
                                                                         │
                                                                         ▼
                                                          ┌─────────────────────────────┐
                                                          │   React 18 Web Dashboard    │
                                                          │  Code viewer, issues, PRs,  │
                                                          │  Actions, Releases, Heatmap │
                                                          └─────────────────────────────┘
```

---

## 🚀 Key Features

### 💻 1. Local VCS Engine (CLI)
- **`safearchive init`**: Initialize a local repository vault (`.safearchive/`) tracking the default `main` branch.
- **`safearchive status`**: Inspect working tree state, branch pointer, staged files, modified files, and untracked files.
- **`safearchive add <file | .>`**: Stage single files or entire directory trees (`add .`) with automatic filtering of `.safearchive`, `.git`, `node_modules`, `.env`, and build artifacts.
- **`safearchive commit <message>`**: Generate an immutable commit snapshot with UUID, timestamp, author metadata, and file snapshot.
- **`safearchive log`**: View formatted chronological revision history with author, date, and commit hashes.
- **`safearchive diff [file]`**: Visual color-coded terminal diff showing added and removed lines between commits and working tree.
- **`safearchive branch [name]`**: List branches, view current active branch, or create new branches.
- **`safearchive checkout <branch>`**: Switch between local branches and restore working tree state.
- **`safearchive remote <repoId>`**: Link your local directory to a remote web platform repository (MongoDB ID).
- **`safearchive push`**: Dual-sync engine — uploads committed artifacts to AWS S3 (`commits/<id>/<file>`) and simultaneously syncs commit metadata and file lists to the web platform via authenticated API.
- **`safearchive pull`**: Pull and unpack remote commit artifacts from AWS S3 into your local vault.
- **`safearchive clone <repoUrl> [dir]`**: Clone a remote repository vault directly from cloud storage to local disk.
- **`safearchive revert <commitID>`**: Restore working tree files to any historical commit snapshot.
- **`safearchive login` / `logout` / `whoami`**: Secure CLI authentication using Personal Access Tokens (PAT).
- **`safearchive token <create|list|revoke>`**: Manage developer access tokens directly from the terminal.

### 🌐 2. Web Collaboration Platform (Frontend & API)
- **Repository Management**: Create public or private repositories, edit metadata, configure descriptions, and manage repository settings.
- **In-Browser Code & Tree Explorer**: Navigate repository file trees, preview files with line numbers and syntax styling, and create or edit files directly in the browser across any branch.
- **Multi-Branching System**: Switch active branches via dropdown, create branches, and delete stale branches with instantaneous tree updates.
- **Actions (CI/CD Workflows)**: Automated pipeline engine that triggers on commits, runs simulated test/build jobs, and displays colored CI status badges on commit revision lists.
- **Releases & Distribution**: Create tagged semantic releases, publish release notes, and generate instant downloadable ZIP archives bundled from S3/MongoDB.
- **Webhooks & Deliveries**: Register HTTP webhook endpoints for repository events (`push`, `issue`, etc.) and inspect delivery payloads and response codes in a dedicated modal.
- **Collaborator Management**: Invite collaborators with granular role-based permissions (`read`, `write`, `admin`).
- **Interactive Issue Tracker**: Create, filter, comment on, and resolve issues with threaded discussion history, status toggles, and emoji reactions.
- **Pull Requests (PRs)**: Create branch-comparison pull requests with conflict detection, comment threads, and 1-click merge into target branches.
- **Personal Access Tokens (PAT)**: Generate and revoke scoped API tokens for secure CLI and script integration (`sat_...`).
- **365-Day Contribution Heatmap**: Dynamic, rolling 52-week activity calendar calculating contributions (repo creations, commits, issues), active streaks, and live socket updates.
- **Customizable Profile**: Showcase up to 6 pinned repositories, edit bio, company, location, and external website links.
- **Real-Time WebSockets**: Live bi-directional updates for commit pushes, repository creations, issues, and star events powered by Socket.IO.
- **Production UI/UX**: Sticky glassmorphic navbar, responsive dark mode design system, Google Fonts typography (Inter), animated shimmer loading skeletons, and SEO meta tags.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, React Router v6, Primer Design System, `@uiw/react-heat-map`, Axios, Socket.IO Client |
| **Backend API** | Node.js, Express 4, MongoDB & Mongoose 8, Socket.IO 4, JWT (`jsonwebtoken`), bcryptjs |
| **CLI Engine** | Node.js, Yargs, `fs/promises`, UUID, native HTTP/HTTPS client |
| **Cloud Storage** | AWS SDK (Amazon S3) for commit archives and downloadable zips |
| **Security** | Helmet, express-rate-limit, express-validator, Personal Access Token SHA-256 hashing |

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **MongoDB**: Local MongoDB instance or MongoDB Atlas connection URI
- **AWS Account**: S3 bucket with read/write IAM credentials (optional for offline CLI, required for cloud sync)

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/safearchive
PORT=3000
JWT_SECRET_KEY=your_strong_jwt_secret
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your_s3_bucket_name
```

Start the API and WebSocket server:
```bash
npm start
```
*API will run at `http://localhost:3000`.*

---

### 3. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
*Web dashboard will be available at `http://localhost:5173`.*

---

### 4. CLI Setup & Workflow

You can run the SafeArchive CLI globally across your computer:

```bash
# From the safearchive/backend directory
npm link
```

#### Complete Local-to-Cloud Workflow:

```bash
# 1. Authenticate CLI using your Personal Access Token (from web Profile > Developer Tokens)
safearchive login

# 2. Navigate to your project folder
cd my-project

# 3. Initialize SafeArchive repository vault
safearchive init

# 4. Stage all project files (automatically ignores node_modules, .git, etc.)
safearchive add .

# 5. Commit your snapshot locally
safearchive commit "Initial project commit"

# 6. Check repository status
safearchive status

# 7. Link to your web repository (copy repository ID from the browser URL: /repo/<repoId>)
safearchive remote <your_repo_id>

# 8. Push to AWS S3 & sync to web dashboard
safearchive push
```

#### Additional CLI Commands:
```bash
safearchive log                    # View commit revision history
safearchive diff                   # View pending changes
safearchive branch feature-auth    # Create a new branch
safearchive checkout feature-auth  # Switch to branch
safearchive pull                   # Pull latest S3 commit archives
safearchive whoami                 # Check authenticated user
```

---

## 🔒 Security & Best Practices

- **Personal Access Tokens (PAT)**: Stored as SHA-256 hashes in MongoDB; raw tokens (`sat_...`) are shown only once at creation.
- **Graceful JWT Secret Handling**: Dynamic secret getters prevent startup timing mismatches and support seamless session continuity.
- **Sensitive File Protection**: CLI staging automatically excludes `.env`, credential stores, `.safearchive`, `.git`, and dependency trees.
- **Production Defense**: HTTP security headers via `helmet`, rate limiting on sensitive routes, and input validation via `express-validator`.

---

## 📄 License

ISC License. Built for developers who want complete control and cloud resilience over their version control stack.
