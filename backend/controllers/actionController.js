const WorkflowRun = require("../models/workflowRunModel");
const Repository = require("../models/repoModel");
const { executeWorkflow, triggerWorkflowForCommit } = require("../utils/workflowRunner");

const listWorkflowRuns = async (req, res) => {
  const { id } = req.params;
  const { branch, status, page = 1, limit = 20 } = req.query;

  try {
    const filter = { repository: id };
    if (branch) filter.branch = branch;
    if (status) filter.status = status;

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const runs = await WorkflowRun.find(filter)
      .populate("triggerUser", "username avatar")
      .select("-steps.logs") // Exclude bulky logs in list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await WorkflowRun.countDocuments(filter);

    res.json({
      runs,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error("Error listing workflow runs:", err);
    res.status(500).json({ error: "Failed to list workflow runs" });
  }
};

const getWorkflowRun = async (req, res) => {
  const { id, runId } = req.params;

  try {
    const run = await WorkflowRun.findOne({ _id: runId, repository: id })
      .populate("triggerUser", "username avatar");

    if (!run) {
      return res.status(404).json({ error: "Workflow run not found" });
    }

    res.json(run);
  } catch (err) {
    console.error("Error getting workflow run:", err);
    res.status(500).json({ error: "Failed to get workflow run" });
  }
};

const rerunWorkflow = async (req, res) => {
  const { id, runId } = req.params;
  const io = req.app.get("io");

  try {
    const run = await WorkflowRun.findOne({ _id: runId, repository: id });
    if (!run) {
      return res.status(404).json({ error: "Workflow run not found" });
    }

    run.status = "queued";
    run.conclusion = "pending";
    run.startedAt = new Date();
    run.completedAt = null;
    run.steps = [];
    await run.save();

    // Trigger async
    setImmediate(() => {
      executeWorkflow(run._id, io).catch((err) =>
        console.error("Async rerun error:", err)
      );
    });

    res.json({ message: "Workflow re-run queued", runId: run._id });
  } catch (err) {
    console.error("Error rerunning workflow:", err);
    res.status(500).json({ error: "Failed to rerun workflow" });
  }
};

const dispatchWorkflow = async (req, res) => {
  const { id } = req.params;
  const { branch = "main" } = req.body;
  const io = req.app.get("io");
  const userId = req.user;

  try {
    const repo = await Repository.findById(id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found" });
    }

    // Find latest commit or generate ID
    const branchMeta = (repo.branches || []).find((b) => b.name === branch);
    const commitID = branchMeta?.headCommit || (repo.commits && repo.commits.length > 0 ? repo.commits[repo.commits.length - 1].commitID : "manual-trigger");

    const run = await triggerWorkflowForCommit({
      repoId: id,
      commitID: commitID || "manual-dispatch",
      commitMessage: `Manual dispatch on ${branch}`,
      branch,
      event: "manual",
      user: userId,
      io,
    });

    res.status(201).json(run);
  } catch (err) {
    console.error("Error dispatching workflow:", err);
    res.status(500).json({ error: "Failed to dispatch workflow" });
  }
};

const getCommitStatus = async (req, res) => {
  const { id, commitId } = req.params;

  try {
    const run = await WorkflowRun.findOne({ repository: id, commitID: commitId })
      .sort({ createdAt: -1 });

    if (!run) {
      return res.json({ status: "none", conclusion: "none" });
    }

    res.json({
      status: run.status,
      conclusion: run.conclusion,
      runId: run._id,
      name: run.name,
      durationMs: run.durationMs,
      completedAt: run.completedAt,
    });
  } catch (err) {
    console.error("Error getting commit status:", err);
    res.status(500).json({ error: "Failed to get commit status" });
  }
};

module.exports = {
  listWorkflowRuns,
  getWorkflowRun,
  rerunWorkflow,
  dispatchWorkflow,
  getCommitStatus,
};