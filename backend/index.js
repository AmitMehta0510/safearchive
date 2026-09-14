#!/usr/bin/env node
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const mainRouter = require("./routes/main.router");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const { commitRepo } = require("./controllers/commit");
const { pushRepo } = require("./controllers/push");
const { pullRepo } = require("./controllers/pull");
const { revertRepo } = require("./controllers/revert");
const { logRepo } = require("./controllers/log");
const { statusRepo } = require("./controllers/status");
const { remoteRepo } = require("./controllers/remote");
const { cloneRepo } = require("./controllers/clone");
const { diffRepo } = require("./controllers/diff");
const { branchRepo } = require("./controllers/branch");
const { checkoutRepo } = require("./controllers/checkout");
const { login, whoami, logout, createTokenCLI } = require("./controllers/auth");

yargs(hideBin(process.argv))
  .usage("Usage: safearchive <command> [options]")
  .command("start", "Start the SafeArchive API & Socket server", {}, startServer)
  .command("init", "Initialize a new SafeArchive repository (.safearchive)", {}, initRepo)
  .command("status", "Show working tree status and staged changes", {}, statusRepo)
  .command("log", "Show chronological commit revision history", {}, logRepo)
  .command(
    "add <file>",
    "Add a file to the SafeArchive staging area",
    (yargs) => {
      yargs.positional("file", { describe: "Path of file to stage", type: "string" });
    },
    (argv) => { addRepo(argv.file); }
  )
  .command(
    "commit <message>",
    "Commit staged files to SafeArchive",
    (yargs) => {
      yargs.positional("message", { describe: "Commit message", type: "string" });
    },
    (argv) => { commitRepo(argv.message); }
  )
  .command("push", "Push local commits to AWS S3 and sync to web dashboard", {}, pushRepo)
  .command("pull", "Pull commits from AWS S3 SafeArchive vault", {}, pullRepo)
  .command(
    "revert <commitID>",
    "Revert working directory to a specific commit snapshot",
    (yargs) => {
      yargs.positional("commitID", { describe: "Commit UUID to revert to", type: "string" });
    },
    (argv) => { revertRepo(argv.commitID); }
  )
  .command(
    "remote <repoId>",
    "Link this local repo to a SafeArchive web platform repository by MongoDB ID",
    (yargs) => {
      yargs.positional("repoId", { describe: "MongoDB repository ID from the web platform", type: "string" });
    },
    (argv) => { remoteRepo(argv.repoId); }
  )
    .command(
    "clone <repoUrl> [directory]",
    "Clone a remote SafeArchive repository vault directly to local disk",
    (yargs) => {
      yargs
        .positional("repoUrl", { describe: "Remote repository URL, Mongo ID, or name", type: "string" })
        .positional("directory", { describe: "Target local directory name", type: "string" });
    },
    (argv) => { cloneRepo(argv.repoUrl, argv.directory); }
  )
  .command(
    "diff [file]",
    "Show visual color-coded terminal diff of changes in working tree or staging area",
    (yargs) => {
      yargs
        .positional("file", { describe: "Optional specific file to diff", type: "string" })
        .option("staged", { alias: "cached", type: "boolean", describe: "Show diff of staged changes" });
    },
    (argv) => { diffRepo(argv.file, argv); }
  )
  .command(
    "branch [name]",
    "List, create, or delete branches in the repository",
    (yargs) => {
      yargs
        .positional("name", { describe: "Branch name to create", type: "string" })
        .option("delete", { alias: "d", type: "string", describe: "Branch name to delete" });
    },
    (argv) => { branchRepo(argv.name, argv); }
  )
  .command(
    "checkout <branch>",
    "Switch branches or restore working tree files",
    (yargs) => {
      yargs
        .positional("branch", { describe: "Branch name to switch to", type: "string" })
        .option("b", { type: "boolean", describe: "Create and switch to a new branch" });
    },
    (argv) => { checkoutRepo(argv.branch, argv); }
  )
  .command(
    "login",
    "Authenticate CLI with a Personal Access Token (PAT)",
    (yargs) => {
      yargs
        .option("token", { describe: "Personal Access Token (sat_...)", type: "string" })
        .option("url", { describe: "SafeArchive server URL", type: "string" });
    },
    (argv) => { login(argv); }
  )
  .command("whoami", "Display the currently authenticated SafeArchive user", {}, whoami)
  .command("logout", "Log out and clear stored CLI credentials", {}, logout)
  .command(
    "token <subcommand> [name]",
    "Manage Personal Access Tokens (PAT) from the terminal",
    (yargs) => {
      yargs
        .command(
          "create [name]",
          "Create a new Personal Access Token",
          (y) => {
            y.positional("name", { describe: "Token description", type: "string" })
             .option("days", { describe: "Expiration in days (default: 30)", type: "number", default: 30 });
          },
          (argv) => { createTokenCLI(argv.name, argv); }
        );
    },
    () => {}
  )
  .demandCommand(1, "Please provide a valid SafeArchive command (try --help)")
  .help().argv;

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Security: HTTP security headers
  app.use(helmet());

  // Security: Global rate limiter (100 req/15min/IP)
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use(globalLimiter);

  // Security: Auth brute-force protection (10 attempts/15min)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again in 15 minutes." },
  });
  app.use("/user/login", authLimiter);
  app.use("/user/signup", authLimiter);

  // CORS: strict allowlist
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    credentials: true,
  }));

  // Body parsing
  app.use(bodyParser.json({ limit: "10mb" }));
  app.use(express.json({ limit: "10mb" }));

  // Database
  const mongoURI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/safearchive";
  mongoose
    .connect(mongoURI)
    .then(() => console.log("[SafeArchive] MongoDB connected successfully!"))
    .catch((err) => console.error("[SafeArchive] MongoDB connection error:", err.message));

  // Socket.io
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
  });

  app.set("io", io);
  app.use("/", mainRouter);

  io.on("connection", (socket) => {
    socket.on("joinRoom", (userID) => {
      socket.join(userID);
      console.log("[SafeArchive Socket] User joined room:", userID);
    });
    socket.on("joinRepo", (repoID) => {
      socket.join("repo_" + repoID);
      console.log("[SafeArchive Socket] Joined repo room:", "repo_" + repoID);
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("[SafeArchive] Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  });

  httpServer.listen(port, () => {
    console.log("=============================================");
    console.log(" SafeArchive Server running on port " + port);
    console.log(" API Endpoint: http://localhost:" + port + "/");
    console.log("=============================================");
  });
}