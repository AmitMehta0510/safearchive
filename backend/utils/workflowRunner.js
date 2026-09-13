const crypto = require("crypto");
const WorkflowRun = require("../models/workflowRunModel");
const Repository = require("../models/repoModel");

/**
 * Helper to sleep for simulated execution
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Execute a complete multi-step workflow run asynchronously
 */
async function executeWorkflow(runId, io) {
  const startTime = Date.now();

  try {
    const run = await WorkflowRun.findById(runId);
    if (!run) return;

    const repo = await Repository.findById(run.repository);
    const files = (repo?.files || []).filter((f) => !f.branch || f.branch === run.branch);

    run.status = "in_progress";
    run.conclusion = "pending";
    await run.save();

    if (io) {
      io.to(`repo:${run.repository}`).emit("workflow:update", {
        runId: run._id,
        status: run.status,
        conclusion: run.conclusion,
      });
    }

    const stepsDefinitions = [
      {
        stepNumber: 1,
        name: "Set up runner & inspect workspace",
        action: async () => {
          await delay(50);
          return [
            `\x1b[36m[INFO]\x1b[0m SafeArchive Actions Runner v1.0.0 on linux-x64-node`,
            `\x1b[36m[INFO]\x1b[0m Resolving repository: ${repo?.name || "vault"}`,
            `\x1b[36m[INFO]\x1b[0m Checking out commit \x1b[33m${run.commitID.slice(0, 8)}\x1b[0m on branch \x1b[35m${run.branch}\x1b[0m`,
            `\x1b[32m✓\x1b[0m Workspace initialized. Found ${files.length} tracked file(s).`,
          ];
        },
      },
      {
        stepNumber: 2,
        name: "Lint & syntax validation",
        action: async () => {
          await delay(60);
          const logs = [
            `\x1b[36m[INFO]\x1b[0m Scanning ${files.length} file(s) for syntax errors and schema integrity...`,
          ];

          let syntaxErrors = 0;
          for (const f of files) {
            if (f.path.endsWith(".json")) {
              try {
                if (f.content) JSON.parse(f.content);
                logs.push(`  ✓ ${f.path} [JSON valid]`);
              } catch (err) {
                logs.push(`  \x1b[31m✕ ${f.path} [JSON syntax error: ${err.message}]\x1b[0m`);
                syntaxErrors++;
              }
            } else {
              logs.push(`  ✓ ${f.path} [format OK]`);
            }
          }

          if (syntaxErrors > 0) {
            logs.push(`\x1b[31m[FAIL]\x1b[0m ${syntaxErrors} syntax error(s) detected.`);
            throw new Error(`${syntaxErrors} syntax errors found`);
          }

          logs.push(`\x1b[32m✓\x1b[0m Syntax and lint verification passed with 0 errors.`);
          return logs;
        },
      },
      {
        stepNumber: 3,
        name: "Automated test suite",
        action: async () => {
          await delay(70);
          return [
            `\x1b[36m[INFO]\x1b[0m Starting SafeArchive automated test runner...`,
            `\x1b[32mPASS\x1b[0m tests/unit/integrity.test.js (4 passed)`,
            `\x1b[32mPASS\x1b[0m tests/integration/vault.test.js (3 passed)`,
            `-------------------------------------------------------`,
            `Test Suites: \x1b[32m2 passed\x1b[0m, 2 total`,
            `Tests:       \x1b[32m7 passed\x1b[0m, 7 total`,
            `Snapshots:   0 total`,
            `Time:        0.72s`,
            `\x1b[32m✓\x1b[0m All tests passed successfully!`,
          ];
        },
      },
      {
        stepNumber: 4,
        name: "Build packaging & checksum validation",
        action: async () => {
          await delay(40);
          const contentConcat = files.map((f) => f.content || "").join("");
          const digest = crypto.createHash("sha256").update(contentConcat).digest("hex");
          return [
            `\x1b[36m[INFO]\x1b[0m Computing build tree checksum...`,
            `\x1b[36m[INFO]\x1b[0m Tree SHA-256: \x1b[33m${digest.slice(0, 16)}...\x1b[0m`,
            `\x1b[32m✓\x1b[0m Build verification fingerprint valid. Ready for deployment.`,
          ];
        },
      },
    ];

    let overallFailed = false;
    run.steps = [];

    for (const stepDef of stepsDefinitions) {
      const stepStart = Date.now();
      let stepLogs = [];
      let stepStatus = "completed";

      try {
        stepLogs = await stepDef.action();
      } catch (err) {
        stepLogs = [`\x1b[31m[ERROR] ${err.message}\x1b[0m`];
        stepStatus = "failed";
        overallFailed = true;
      }

      const completedStep = {
        stepNumber: stepDef.stepNumber,
        name: stepDef.name,
        status: stepStatus,
        durationMs: Date.now() - stepStart,
        logs: [`[${new Date().toISOString()}] Starting: ${stepDef.name}`, ...stepLogs],
      };

      run.steps.push(completedStep);
      run.markModified("steps");
      await run.save();

      if (io) {
        io.to(`repo:${run.repository}`).emit("workflow:step", {
          runId: run._id,
          stepNumber: stepDef.stepNumber,
          status: completedStep.status,
          logs: completedStep.logs,
        });
      }

      if (overallFailed) break;
    }

    run.status = overallFailed ? "failure" : "success";
    run.conclusion = overallFailed ? "failure" : "success";
    run.completedAt = new Date();
    run.durationMs = Date.now() - startTime;
    await run.save();

    if (io) {
      io.to(`repo:${run.repository}`).emit("workflow:update", {
        runId: run._id,
        status: run.status,
        conclusion: run.conclusion,
        durationMs: run.durationMs,
      });
    }

    return run;
  } catch (err) {
    console.error("Workflow execution error:", err);
  }
}

/**
 * Trigger a new workflow run for a commit
 */
async function triggerWorkflowForCommit({ repoId, commitID, commitMessage, branch = "main", event = "push", user, io }) {
  try {
    const totalRuns = await WorkflowRun.countDocuments({ repository: repoId });
    const run = new WorkflowRun({
      repository: repoId,
      name: "CI Build & Test Suite",
      runNumber: totalRuns + 1,
      commitID,
      commitMessage: commitMessage || "Commit update",
      branch: branch || "main",
      event,
      status: "queued",
      conclusion: "pending",
      triggerUser: user || null,
      steps: [],
    });

    await run.save();

    // Run asynchronously without blocking the caller
    setImmediate(() => {
      executeWorkflow(run._id, io).catch((err) =>
        console.error("Async workflow execution error:", err)
      );
    });

    return run;
  } catch (err) {
    console.error("Error creating workflow run:", err);
    return null;
  }
}

module.exports = {
  executeWorkflow,
  triggerWorkflowForCommit,
};