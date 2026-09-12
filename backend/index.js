const express = require("express");
const dotenv = require("dotenv");
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

dotenv.config();

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
      yargs.positional("file", {
        describe: "Path of file to stage",
        type: "string",
      });
    },
    (argv) => {
      addRepo(argv.file);
    }
  )
  .command(
    "commit <message>",
    "Commit staged files to SafeArchive",
    (yargs) => {
      yargs.positional("message", {
        describe: "Commit message",
        type: "string",
      });
    },
    (argv) => {
      commitRepo(argv.message);
    }
  )
  .command("push", "Push local commits to AWS S3 SafeArchive vault", {}, pushRepo)
  .command("pull", "Pull commits from AWS S3 SafeArchive vault", {}, pullRepo)
  .command(
    "revert <commitID>",
    "Revert working directory to a specific commit snapshot",
    (yargs) => {
      yargs.positional("commitID", {
        describe: "Commit UUID to revert to",
        type: "string",
      });
    },
    (argv) => {
      revertRepo(argv.commitID);
    }
  )
  .demandCommand(1, "Please provide a valid SafeArchive command (try --help)")
  .help().argv;

function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Security: HTTP security headers (XSS, clickjacking, MIME sniff, HSTS, CSP, etc.)
  app.use(helmet());

  // Security: Global rate limiter -- 100 requests per 15 min per IP
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
  });
  app.use(globalLimiter);

  // Security: Auth brute-force protection -- 10 attempts per 15 min per IP
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts, please try again in 15 minutes." },
  });
  app.use("/user/login", authLimiter);
  app.use("/user/signup", authLimiter);

  // CORS: only allow known origins (set ALLOWED_ORIGINS in .env for production)
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:3000"];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
      credentials: true,
    })
  );

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

  // Global error handler -- catches errors passed via next(err) from route handlers
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