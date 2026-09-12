# 🛡️ SafeArchive

> **Secure, Cloud-Backed Distributed Version Control & Collaboration Platform**

SafeArchive is an end-to-end full-stack Git and GitHub alternative combining a lightweight local version control engine with cloud-backed revision storage (AWS S3) and a modern collaborative web platform (React + Node.js + MongoDB + WebSockets).

---

## 🚀 Key Features

### 💻 1. Local VCS Engine (CLI)
- **`safearchive init`**: Initialize a local repository repository vault (`.safearchive`).
- **`safearchive status`**: Inspect working tree state, branch, staged files, and untracked files.
- **`safearchive add <file>`**: Stage changes into the staging area.
- **`safearchive commit <message>`**: Generate an immutable commit snapshot with metadata and touched files.
- **`safearchive log`**: View formatted chronological revision history.
- **`safearchive push` / `pull`**: Synchronize local commit archives to and from cloud storage (AWS S3).
- **`safearchive revert <commitID>`**: Restore working files to any historical commit snapshot.

### 🌐 2. Web Collaboration Hub (Frontend & API)
- **Repository Management:** Create, browse, and manage public/private repositories.
- **Code & File Explorer:** Browse tracked files and preview file contents online.
- **Issue Tracker:** Full bug tracking with status filters (`open`, `closed`), status toggling, and issue deletion.
- **Commits Explorer:** View historical commit timelines with short commit hash pills and 1-click clipboard copy.
- **Real-Time WebSockets:** Live bi-directional activity stream for repository creations, issue updates, and starring events powered by Socket.IO.
- **Interactive Heatmap:** Dynamic contribution heatmap tracking user activity over a 120-day rolling window.
- **Star & Follow System:** Star repositories and follow developers with real-time counters.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, React Router v6, Primer Design System (`@primer/react`), `@uiw/react-heat-map`, Socket.io-client, Axios.
- **Backend:** Node.js, Express, MongoDB & Mongoose, Socket.IO, JWT Authentication, bcryptjs.
- **CLI Engine:** Node.js, Yargs, `fs/promises`, UUID.
- **Cloud Storage:** AWS SDK (Amazon S3).

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js (v18+)
- MongoDB running locally or MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env   # Configure your MongoDB & AWS credentials
npm start              # Launches Express & Socket.IO server on port 3000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev            # Launches Vite development server
```

### 4. CLI Usage
Run SafeArchive CLI commands from any terminal:
```bash
cd backend
node index.js --help
node index.js init
node index.js add <file>
node index.js commit "Initial commit"
node index.js log
node index.js status
```

---

## 📄 License
ISC License. Built for developers who want complete ownership of their version control stack.
