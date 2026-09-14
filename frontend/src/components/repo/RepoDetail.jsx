import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../config/api";
import Navbar from "../Navbar";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import ReadmeViewer from "./ReadmeViewer";
import CommitDiffViewer from "./CommitDiffViewer";
import BranchDropdown from "./BranchDropdown";
import PullRequestList from "./PullRequestList";
import PullRequestDetail from "./PullRequestDetail";
import NewPullRequestModal from "./NewPullRequestModal";
import ReactionPicker from "../ReactionPicker";
import IssueDetail from "../issue/IssueDetail";
import { SkeletonRepoHeader, SkeletonCard } from "../Skeleton";
import usePageMeta from "../../hooks/usePageMeta";
import "./repoDetail.css";

// ── Quick Setup Panel ─────────────────────────────────────────────────────────
const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? "#3fb950" : "#8b949e",
        fontSize: "0.8rem",
        padding: "2px 6px",
        borderRadius: "4px",
        flexShrink: 0,
        transition: "color 0.2s",
      }}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
};

const CmdLine = ({ cmd }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      padding: "4px 12px",
      borderRadius: "4px",
      background: "#0d1117",
    }}
  >
    <code style={{ fontSize: "0.82rem", color: "#e6edf3", wordBreak: "break-all" }}>
      {cmd}
    </code>
    <CopyButton text={cmd} />
  </div>
);

const QuickSetupPanel = ({ repo }) => {
  const ownerSlug = repo?.owner?.username
    ? `${repo.owner.username}/${repo.name}`
    : repo?.name || "<repo>";

  const newProjectCmds = [
    "npm install -g safearchive",
    "cd /path/to/your-project",
    "safearchive init",
    "safearchive login",
    `safearchive remote ${ownerSlug}`,
    "safearchive add .",
    'safearchive commit "Initial commit"',
    "safearchive push",
  ];

  const existingCmds = [
    "cd /path/to/your-project",
    `safearchive remote ${ownerSlug}`,
    "safearchive push",
  ];

  const sectionStyle = {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "8px",
    padding: "16px",
    flex: 1,
    minWidth: 0,
  };

  const headingStyle = {
    margin: "0 0 12px",
    fontSize: "0.85rem",
    color: "#8b949e",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div
        style={{
          background: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px 24px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ margin: "0 0 6px", color: "#f0f6fc", fontSize: "1rem" }}>
          🚀 Quick Setup — connect your local project
        </h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#8b949e" }}>
          This repository is empty. Push your first commit using the{" "}
          <code
            style={{
              background: "#0d1117",
              padding: "1px 5px",
              borderRadius: "4px",
              color: "#e6edf3",
            }}
          >
            safearchive
          </code>{" "}
          CLI.
        </p>

        {/* Remote slug pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "14px",
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: "6px",
            padding: "8px 14px",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>remote:</span>
          <code style={{ fontSize: "0.88rem", color: "#79c0ff" }}>{ownerSlug}</code>
          <CopyButton text={ownerSlug} />
        </div>
      </div>

      {/* Two-column command blocks */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {/* New project */}
        <div style={sectionStyle}>
          <h4 style={headingStyle}>…create a new project</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {newProjectCmds.map((cmd) => (
              <CmdLine key={cmd} cmd={cmd} />
            ))}
          </div>
        </div>

        {/* Existing project */}
        <div style={sectionStyle}>
          <h4 style={headingStyle}>…connect an existing project</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {existingCmds.map((cmd) => (
              <CmdLine key={cmd} cmd={cmd} />
            ))}
          </div>
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#0d1117",
              borderRadius: "6px",
              border: "1px solid #30363d",
            }}
          >
            <p style={{ margin: "0 0 6px", fontSize: "0.8rem", color: "#8b949e" }}>
              ℹ️ First time? Install the CLI once globally:
            </p>
            <CmdLine cmd="npm install -g safearchive" />
          </div>
        </div>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const RepoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repo, setRepo] = useState(null);
  const [issues, setIssues] = useState([]);
  const [commits, setCommits] = useState([]);
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("code"); // "code" | "commits" | "pulls" | "issues" | "settings"

  // Multi-Branch State
  const [activeBranch, setActiveBranch] = useState("main");
  const [branches, setBranches] = useState([{ name: "main" }]);

  // Collaborators State
  const [collaborators, setCollaborators] = useState([]);
  const [newCollabUsername, setNewCollabUsername] = useState("");
  const [newCollabRole, setNewCollabRole] = useState("write");
  const [collabLoading, setCollabLoading] = useState(false);
  // Pull Requests State
  const [pullRequests, setPullRequests] = useState([]);
  const [prCounts, setPrCounts] = useState({ openCount: 0, closedCount: 0, mergedCount: 0, totalCount: 0 });
  const [prFilter, setPrFilter] = useState("open");
  const [selectedPR, setSelectedPR] = useState(null);

  // Phase 5: Actions (CI/CD) State
  const [actionsRuns, setActionsRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchBranch, setDispatchBranch] = useState("main");
  const [actionsLoading, setActionsLoading] = useState(false);
  const [commitStatuses, setCommitStatuses] = useState({}); // { commitID: { status, conclusion } }

  // Phase 5: Releases State
  const [releases, setReleases] = useState([]);
  const [isNewReleaseModalOpen, setIsNewReleaseModalOpen] = useState(false);
  const [newReleaseTag, setNewReleaseTag] = useState("");
  const [newReleaseTitle, setNewReleaseTitle] = useState("");
  const [newReleaseBody, setNewReleaseBody] = useState("");
  const [newReleaseBranch, setNewReleaseBranch] = useState("main");
  const [newReleasePrerelease, setNewReleasePrerelease] = useState(false);

  // Phase 5: Webhooks State
  const [webhooks, setWebhooks] = useState([]);
  const [isAddWebhookModalOpen, setIsAddWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [webhookEvents, setWebhookEvents] = useState(["push", "issue_created", "pr_merged"]);
  const [selectedDeliveries, setSelectedDeliveries] = useState(null);
  const [isNewPRModalOpen, setIsNewPRModalOpen] = useState(false);

  // Code Explorer & File Viewer State
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [readmeContent, setReadmeContent] = useState("");

  // Commit Diff Viewer State
  const [selectedCommitDiff, setSelectedCommitDiff] = useState(null);

  // File Creation / Edit Modal State
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileContent, setNewFileContent] = useState("");
  const [newFileCommitMsg, setNewFileCommitMsg] = useState("");

  // Issue Form & Filtering State
  const [issueFilter, setIssueFilter] = useState("all");
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Commit Creation State
  const [isCommitModalOpen, setIsCommitModalOpen] = useState(false);
  const [newCommitMsg, setNewCommitMsg] = useState("");
  const [newCommitFilesInput, setNewCommitFilesInput] = useState("");

  // Settings State
  const [newDescription, setNewDescription] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");

  // Star State
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);

  const currentUserId = localStorage.getItem("userId");
  usePageMeta(
    repo ? `${repo.name}` : "Repository",
    repo ? `View and manage the ${repo.name} repository on SafeArchive.` : ""
  );

  const fetchRepoData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/repo/${id}`);
      const repoData = Array.isArray(res.data) ? res.data[0] : res.data;
      setRepo(repoData);
      setNewDescription(repoData?.description || "");
      setStarCount(repoData?.starCount ?? (repoData?.starRepos?.length ?? 0));

      // Fetch branches
      try {
        const branchRes = await api.get(`/repo/${id}/branches`);
        const branchList = branchRes.data?.branches || [{ name: "main" }];
        setBranches(branchList);
        const defBranch = branchRes.data?.defaultBranch || "main";
        if (!activeBranch || activeBranch === "main") {
          setActiveBranch(defBranch);
        }
      } catch (branchErr) {
        console.warn("Branch fetch error:", branchErr);
      }

      // Fetch tree for current branch
      try {
        const treeRes = await api.get(`/repo/${id}/tree?branch=${encodeURIComponent(activeBranch || "main")}`);
        setTree(treeRes.data?.tree || []);
      } catch (treeErr) {
        console.warn("Tree fetch error:", treeErr);
      }

      
      // Fetch collaborators
      try {
        const collabRes = await api.get(`/repo/${id}/collaborators`);
        setCollaborators(collabRes.data?.collaborators || []);
      } catch {}
      // Fetch pull requests
      try {
        const prRes = await api.get(`/repo/${id}/pulls?status=all`);
        setPullRequests(prRes.data?.pullRequests || []);
        setPrCounts({
          openCount: prRes.data?.openCount || 0,
          closedCount: prRes.data?.closedCount || 0,
          mergedCount: prRes.data?.mergedCount || 0,
          totalCount: prRes.data?.totalCount || 0,
        });
      } catch (prErr) {
        console.warn("PR fetch error:", prErr);
      }

      // Fetch issues
      const issueRes = await api.get(`/issue/repo/${id}`);
      setIssues(issueRes.data?.issues || issueRes.data || []);

      // Fetch commits
      const commitRes = await api.get(`/repo/${id}/commits`);
      setCommits(commitRes.data || []);

      if (currentUserId) {
        try {
          const userRes = await api.get(`/userProfile/${currentUserId}`);
          const starredIds = (userRes.data.starRepos || []).map((r) => r._id || r);
          setIsStarred(starredIds.includes(id));
        } catch {}
      }
    } catch (err) {
      console.error("Error fetching repository:", err);
      setError("Repository not found or could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [id, currentUserId, activeBranch]);

  useEffect(() => {
    fetchRepoData();
  }, [fetchRepoData]);

  // Load README when tree or branch changes
  useEffect(() => {
    if (!tree || tree.length === 0) {
      setReadmeContent("");
      return;
    }
    const hasReadme = tree.some((item) =>
      item.path.toLowerCase().endsWith("readme.md")
    );
    if (hasReadme) {
      const readmePath = tree.find((item) =>
        item.path.toLowerCase().endsWith("readme.md")
      ).path;

      api
        .get(`/repo/${id}/file?path=${encodeURIComponent(readmePath)}&branch=${encodeURIComponent(activeBranch)}`)
        .then((res) => {
          if (res.data?.content) {
            setReadmeContent(res.data.content);
          }
        })
        .catch(() => {});
    } else {
      setReadmeContent("");
    }
  }, [id, tree, activeBranch]);

  const handleSelectBranch = async (branchName) => {
    setActiveBranch(branchName);
    setSelectedFile(null);
    setFileData(null);
    try {
      const treeRes = await api.get(`/repo/${id}/tree?branch=${encodeURIComponent(branchName)}`);
      setTree(treeRes.data?.tree || []);
    } catch (err) {
      console.warn("Branch tree fetch error:", err);
    }
  };

  const handleCreateBranch = async (branchName) => {
    await api.post(`/repo/${id}/branches`, {
      name: branchName,
      fromBranch: activeBranch,
    });
    const branchRes = await api.get(`/repo/${id}/branches`);
    setBranches(branchRes.data?.branches || [{ name: "main" }]);
    handleSelectBranch(branchName);
  };

  const handleSelectFile = async (filePath) => {
    try {
      setFileLoading(true);
      setSelectedFile(filePath);
      const res = await api.get(
        `/repo/${id}/file?path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(activeBranch)}`
      );
      setFileData(res.data);
    } catch (err) {
      alert("Failed to load file content: " + (err.response?.data?.error || err.message));
      setSelectedFile(null);
    } finally {
      setFileLoading(false);
    }
  };

  const handleCloseFile = () => {
    setSelectedFile(null);
    setFileData(null);
  };

  const handleDownloadZip = () => {
    const apiBase = api.defaults.baseURL || "http://localhost:3000";
    window.open(
      `${apiBase}/repo/${id}/archive/zip?branch=${encodeURIComponent(activeBranch)}`,
      "_blank"
    );
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      await api.post(`/repo/${id}/file`, {
        path: newFileName.trim(),
        content: newFileContent,
        branch: activeBranch,
        message: newFileCommitMsg.trim() || `Create ${newFileName.trim()}`,
      });

      setNewFileName("");
      setNewFileContent("");
      setNewFileCommitMsg("");
      setIsFileModalOpen(false);
      handleSelectBranch(activeBranch);
    } catch (err) {
      alert("Failed to save file: " + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;

    try {
      const res = await api.post("/issue/create", {
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim(),
        repository: id,
      });

      setIssues([res.data, ...issues]);
      setNewIssueTitle("");
      setNewIssueDesc("");
      setIsIssueModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create issue.");
    }
  };

  const handleToggleIssueStatus = async (issueId, currentStatus) => {
    const nextStatus = currentStatus === "open" ? "closed" : "open";
    try {
      const res = await api.put(`/issue/update/${issueId}`, {
        status: nextStatus,
      });

      setIssues(issues.map((iss) => (iss._id === issueId ? res.data : iss)));
    } catch (err) {
      alert("Failed to update issue status.");
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    try {
      await api.delete(`/issue/delete/${issueId}`);
      setIssues(issues.filter((iss) => iss._id !== issueId));
    } catch (err) {
      alert("Failed to delete issue.");
    }
  };

  const handleCreateCommit = async (e) => {
    e.preventDefault();
    if (!newCommitMsg.trim()) return;

    const filesArray = newCommitFilesInput
      ? newCommitFilesInput.split(",").map((f) => f.trim()).filter(Boolean)
      : (tree || []).slice(0, 3).map((f) => f.path);

    const randomHex = Math.random().toString(16).substring(2, 10);

    try {
      const res = await api.post(`/repo/${id}/commit`, {
        commitID: randomHex,
        message: newCommitMsg.trim(),
        files: filesArray,
        branch: activeBranch,
      });

      setCommits([res.data.commit, ...commits]);
      setNewCommitMsg("");
      setNewCommitFilesInput("");
      setIsCommitModalOpen(false);
      fetchRepoData();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to record commit.");
    }
  };

  const handleToggleVisibility = async () => {
    try {
      const res = await api.patch(`/repo/toggle/${id}`);
      setRepo(res.data.repository);
      setSettingsMessage("Visibility updated successfully!");
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (err) {
      alert("Failed to change visibility.");
    }
  };

  const handleUpdateDescription = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/repo/update/${id}`, {
        description: newDescription.trim(),
      });
      setRepo(res.data.repository);
      setSettingsMessage("Description updated successfully!");
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (err) {
      alert("Failed to update description.");
    }
  };

  const handleDeleteRepository = async () => {
    const confirmName = window.prompt(`To confirm deletion, type '${repo.name}':`);
    if (confirmName !== repo.name) {
      alert("Repository name did not match. Deletion cancelled.");
      return;
    }

    try {
      await api.delete(`/repo/delete/${id}`);
      alert("Repository deleted successfully.");
      navigate("/");
    } catch (err) {
      alert("Failed to delete repository.");
    }
  };


  // Phase 5 Handlers
  const fetchActionsRuns = async () => {
    try {
      setActionsLoading(true);
      const res = await api.get("/repo/" + id + "/actions/runs");
      setActionsRuns(res.data.runs || []);
    } catch (err) {
      console.error("Error fetching actions runs:", err);
    } finally {
      setActionsLoading(false);
    }
  };

  // Fetch CI status for each commit and store in a map
  const fetchCommitStatuses = async (commitList) => {
    if (!commitList || commitList.length === 0) return;
    const statusMap = {};
    await Promise.allSettled(
      commitList.slice(0, 20).map(async (commit) => {
        try {
          const res = await api.get(`/repo/${id}/commits/${commit.commitID}/status`);
          statusMap[commit.commitID] = res.data;
        } catch {
          statusMap[commit.commitID] = { status: "none", conclusion: "none" };
        }
      })
    );
    setCommitStatuses((prev) => ({ ...prev, ...statusMap }));
  };

  const handleDispatchWorkflow = async (e) => {
    e.preventDefault();
    try {
      await api.post("/repo/" + id + "/actions/dispatch", { branch: dispatchBranch });
      setIsDispatchModalOpen(false);
      fetchActionsRuns();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to dispatch workflow");
    }
  };

  const handleRerunWorkflow = async (runId) => {
    try {
      await api.post("/repo/" + id + "/actions/runs/" + runId + "/rerun");
      fetchActionsRuns();
      if (selectedRun && selectedRun._id === runId) {
        const updated = await api.get("/repo/" + id + "/actions/runs/" + runId);
        setSelectedRun(updated.data);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to rerun workflow");
    }
  };

  const fetchReleases = async () => {
    try {
      const res = await api.get("/repo/" + id + "/releases");
      setReleases(res.data || []);
    } catch (err) {
      console.error("Error fetching releases:", err);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    try {
      await api.post("/repo/" + id + "/releases", {
        tagName: newReleaseTag.trim(),
        name: newReleaseTitle.trim(),
        body: newReleaseBody,
        targetBranch: newReleaseBranch,
        isPrerelease: newReleasePrerelease,
      });
      setIsNewReleaseModalOpen(false);
      setNewReleaseTag("");
      setNewReleaseTitle("");
      setNewReleaseBody("");
      fetchReleases();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create release");
    }
  };

  const handleDeleteRelease = async (releaseId) => {
    if (!window.confirm("Are you sure you want to delete this release?")) return;
    try {
      await api.delete("/repo/" + id + "/releases/" + releaseId);
      fetchReleases();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete release");
    }
  };

  const fetchWebhooks = async () => {
    try {
      const res = await api.get("/repo/" + id + "/webhooks");
      setWebhooks(res.data || []);
    } catch (err) {
      console.error("Error fetching webhooks:", err);
    }
  };

  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    try {
      await api.post("/repo/" + id + "/webhooks", {
        url: webhookUrl.trim(),
        secret: webhookSecret.trim(),
        events: webhookEvents,
      });
      setIsAddWebhookModalOpen(false);
      setWebhookUrl("");
      setWebhookSecret("");
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create webhook");
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!window.confirm("Are you sure you want to delete this webhook?")) return;
    try {
      await api.delete("/repo/" + id + "/webhooks/" + webhookId);
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete webhook");
    }
  };

  const handleTestWebhook = async (webhookId) => {
    try {
      const res = await api.post("/repo/" + id + "/webhooks/" + webhookId + "/test");
      alert("Ping event dispatched! Status Code: " + res.data.delivery?.statusCode);
      fetchWebhooks();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to test webhook");
    }
  };

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!newCollabUsername.trim()) return;

    try {
      setCollabLoading(true);
      const res = await api.post(`/repo/${id}/collaborators`, {
        username: newCollabUsername.trim(),
        role: newCollabRole,
      });
      setCollaborators(res.data.collaborators || []);
      setNewCollabUsername("");
      setSettingsMessage(`Collaborator ${newCollabUsername} added successfully!`);
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add collaborator.");
    } finally {
      setCollabLoading(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this collaborator?")) return;
    try {
      const res = await api.delete(`/repo/${id}/collaborators/${userId}`);
      setCollaborators(res.data.collaborators || []);
      setSettingsMessage("Collaborator removed.");
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to remove collaborator.");
    }
  };

  const handleReactIssue = async (issueId, emoji) => {
    try {
      const res = await api.post(`/issue/${issueId}/react`, { emoji });
      setIssues((prev) =>
        prev.map((iss) => (iss._id === issueId ? { ...iss, reactions: res.data.reactions } : iss))
      );
    } catch (err) {
      console.error("Error reacting to issue:", err);
    }
  };
  const handleToggleStar = async () => {
    if (!currentUserId) {
      alert("Please log in to star this repository.");
      return;
    }
    try {
      const res = await api.post(`/user/star/${id}`);
      setIsStarred(res.data.isStarred);
      setStarCount(res.data.starCount);
    } catch (err) {
      alert("Failed to update star.");
    }
  };

  if (loading && !repo) {
    return (
      <>
        <Navbar />
        <div className="repo-detail-container">
          <SkeletonRepoHeader />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "16px" }}>
            {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
          </div>
        </div>
      </>
    );
  }

  if (error || !repo) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: "center", padding: "60px", color: "#ff7b72" }}>
          <h2>{error || "Repository not found."}</h2>
          <Link to="/" style={{ color: "#58a6ff" }}>
            Return to Dashboard
          </Link>
        </div>
      </>
    );
  }

  const filteredIssues = issues.filter((iss) => {
    if (issueFilter === "open") return iss.status === "open";
    if (issueFilter === "closed") return iss.status === "closed";
    return true;
  });

  const filteredPullRequests = pullRequests.filter((pr) => {
    if (prFilter === "all") return true;
    return pr.status === prFilter;
  });

  const openCount = issues.filter((i) => i.status === "open").length;
  const isOwner = repo.owner?._id === currentUserId || repo.owner === currentUserId;

  return (
    <>
      <Navbar />
      <div className="repo-detail-container">
        {/* Repository Header */}
        <header className="repo-header">
          <div className="repo-title-row">
            <div className="repo-breadcrumb">
              <svg height="20" viewBox="0 0 16 16" width="20" fill="#8b949e">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z"></path>
              </svg>
              <span>{repo.owner?.username || "user"}</span>
              <span className="separator">/</span>
              <span style={{ color: "#f0f6fc" }}>{repo.name}</span>
              <span className="badge-visibility">{repo.visibility}</span>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <BranchDropdown
                branches={branches}
                activeBranch={activeBranch}
                onSelectBranch={handleSelectBranch}
                onCreateBranch={handleCreateBranch}
              />

              <button
                className="btn-secondary"
                onClick={handleToggleStar}
                style={{
                  color: isStarred ? "#e3b341" : "#c9d1d9",
                  borderColor: isStarred ? "#e3b341" : "#30363d",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>{isStarred ? "★ Starred" : "☆ Star"}</span>
                {starCount > 0 && <span className="tab-counter">{starCount}</span>}
              </button>

              <button
                className="btn-secondary"
                onClick={handleDownloadZip}
                title={`Download ${activeBranch} as ZIP`}
              >
                <svg height="14" viewBox="0 0 16 16" width="14" fill="#8b949e" style={{ marginRight: "6px" }}>
                  <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                  <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
                </svg>
                Download ZIP
              </button>

              <button
                className="btn-secondary"
                onClick={() => {
                  setNewFileName("");
                  setNewFileContent("");
                  setNewFileCommitMsg("");
                  setIsFileModalOpen(true);
                }}
              >
                + Add File
              </button>
            </div>
          </div>

          <p className="repo-description">
            {repo.description || "No description provided for this repository."}
          </p>
        </header>

        {/* Navigation Tabs */}
        <nav className="repo-nav-tabs">
          <button
            className={`repo-tab ${activeTab === "code" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("code");
              setSelectedCommitDiff(null);
            }}
          >
            Code
            <span className="tab-counter">{tree.length || (repo.content || []).length}</span>
          </button>
          <button
            className={`repo-tab ${activeTab === "commits" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("commits");
              setSelectedCommitDiff(null);
              fetchCommitStatuses(commits);
            }}
          >
            Commits
            <span className="tab-counter">{commits.length}</span>
          </button>
          <button
            className={`repo-tab ${activeTab === "pulls" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("pulls");
              setSelectedCommitDiff(null);
              setSelectedFile(null);
            }}
          >
            Pull requests
            <span className="tab-counter">{prCounts.openCount || 0}</span>
          </button>
          <button
            className={`repo-tab ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("issues");
              setSelectedCommitDiff(null);
            }}
          >
            Issues
            <span className="tab-counter">{openCount}</span>
          </button>
          <button
            className={`repo-tab ${activeTab === "actions" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("actions");
              setSelectedCommitDiff(null);
              setSelectedRun(null);
              fetchActionsRuns();
            }}
          >
            Actions
            <span className="tab-counter">{actionsRuns.length}</span>
          </button>
          <button
            className={`repo-tab ${activeTab === "releases" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("releases");
              setSelectedCommitDiff(null);
              fetchReleases();
            }}
          >
            Releases
            <span className="tab-counter">{releases.length}</span>
          </button>
          {isOwner && (
            <button
              className={`repo-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                setSelectedCommitDiff(null);
                fetchWebhooks();
              }}
            >
              Settings
            </button>
          )}
        </nav>

        {/* TAB 1: CODE & FILES */}
        {activeTab === "code" && (
          <main>
            {selectedFile ? (
              fileLoading ? (
                <div style={{ textAlign: "center", padding: "60px", color: "#8b949e" }}>
                  Loading {selectedFile}...
                </div>
              ) : (
                <CodeViewer
                  fileData={fileData}
                  onClose={handleCloseFile}
                  onEdit={() => {
                    setNewFileName(fileData.path);
                    setNewFileContent(fileData.content);
                    setNewFileCommitMsg(`Update ${fileData.path}`);
                    setIsFileModalOpen(true);
                  }}
                />
              )
            ) : (
              <>
                <FileTree
                  tree={tree}
                  onSelectFile={handleSelectFile}
                  onAddFile={() => {
                    setNewFileName("");
                    setNewFileContent("");
                    setNewFileCommitMsg("");
                    setIsFileModalOpen(true);
                  }}
                  onDownloadZip={handleDownloadZip}
                  repoName={repo.name}
                  branch={activeBranch}
                />

                {readmeContent && (
                  <ReadmeViewer content={readmeContent} repoName={repo.name} />
                )}

                <section className="cli-banner" style={{ marginTop: "24px" }}>
                  <h4>Quick Setup & Remote Sync with SafeArchive CLI</h4>
                  <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: "4px 0 12px 0" }}>
                    Get started with your terminal using SafeArchive CLI commands on branch <code>{activeBranch}</code>:
                  </p>
                  <pre className="cli-code-block">
                    <code>
{`# 1. Initialize SafeArchive in your local workspace
safearchive init

# 2. Stage and commit your files
safearchive add .
safearchive commit "Initial commit"

# 3. Push snapshots directly to SafeArchive vault
safearchive push`}
                    </code>
                  </pre>
                </section>
              </>
            )}
          </main>
        )}

        {/* TAB 2: COMMITS & DIFF VIEWER */}
        {activeTab === "commits" && (
          <main>
            {selectedCommitDiff ? (
              <CommitDiffViewer
                diffData={selectedCommitDiff}
                onBack={() => setSelectedCommitDiff(null)}
              />
            ) : (
              <div className="commits-view">
                <div className="commits-header-row">
                  <div>
                    <h3 style={{ margin: 0, color: "#f0f6fc" }}>Commit History</h3>
                    <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                      Showing revisions on branch <code>{activeBranch}</code>
                    </span>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setNewCommitMsg("");
                      setNewCommitFilesInput("");
                      setIsCommitModalOpen(true);
                    }}
                  >
                    + Record Snapshot
                  </button>
                </div>

                <div className="commits-timeline">
                  {commits.length === 0 ? (
                    <QuickSetupPanel repo={repo} />
                  ) : (
                    commits.map((commit) => (
                      <div key={commit.commitID} className="commit-row">
                        <div className="commit-info">
                          <div className="commit-title-row">
                            <span className="commit-message">{commit.message}</span>
                            <span className="commit-badge-branch">{commit.branch || "main"}</span>
                            {(() => {
                              const cs = commitStatuses[commit.commitID];
                              if (!cs || cs.status === "none") return null;
                              const ciColor =
                                cs.conclusion === "success" ? "#3fb950"
                                : cs.conclusion === "failure" ? "#f85149"
                                : cs.status === "in_progress" ? "#d29922"
                                : "#8b949e";
                              const ciLabel =
                                cs.conclusion === "success" ? "CI: passed"
                                : cs.conclusion === "failure" ? "CI: failed"
                                : cs.status === "in_progress" ? "CI: running"
                                : "CI: " + cs.status;
                              return (
                                <span
                                  title={ciLabel}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "0.75rem",
                                    color: ciColor,
                                    border: `1px solid ${ciColor}`,
                                    borderRadius: "12px",
                                    padding: "1px 8px",
                                    marginLeft: "6px",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "7px",
                                      height: "7px",
                                      borderRadius: "50%",
                                      backgroundColor: ciColor,
                                    }}
                                  />
                                  {ciLabel}
                                </span>
                              );
                            })()}
                          </div>
                          <div className="commit-meta">
                            <span>ID: <code>{commit.commitID}</code></span>
                            <span className="meta-sep">&bull;</span>
                            <span>{new Date(commit.date).toLocaleString()}</span>
                            {commit.files && commit.files.length > 0 && (
                              <>
                                <span className="meta-sep">&bull;</span>
                                <span>{commit.files.length} file(s) modified</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          className="btn-diff-view"
                          onClick={async () => {
                            try {
                              const diffRes = await api.get(
                                `/repo/${id}/commits/${commit.commitID}/diff`
                              );
                              setSelectedCommitDiff(diffRes.data);
                            } catch (err) {
                              alert("Failed to load diff: " + (err.response?.data?.error || err.message));
                            }
                          }}
                        >
                          View Diff &rarr;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </main>
        )}

        {/* TAB 3: PULL REQUESTS */}
        {activeTab === "pulls" && (
          <main>
            {selectedPR ? (
              <PullRequestDetail
                prId={selectedPR._id || selectedPR.prNumber}
                repoId={id}
                onBack={() => {
                  setSelectedPR(null);
                  fetchRepoData();
                }}
                onUpdated={fetchRepoData}
              />
            ) : (
              <PullRequestList
                pullRequests={filteredPullRequests}
                counts={prCounts}
                activeFilter={prFilter}
                onChangeFilter={setPrFilter}
                onSelectPR={(pr) => setSelectedPR(pr)}
                onNewPR={() => setIsNewPRModalOpen(true)}
              />
            )}
          </main>
        )}

        {/* TAB 4: ISSUES */}
        {activeTab === "issues" && (
          <main>
            {selectedIssue ? (
              <IssueDetail
                issueId={selectedIssue._id}
                repoId={id}
                onBack={() => {
                  setSelectedIssue(null);
                  fetchRepoData();
                }}
                onUpdated={fetchRepoData}
              />
            ) : (
              <>
                <div className="issues-controls">
                  <div className="issue-filter-buttons">
                    <button
                      className={`issue-filter-btn ${issueFilter === "all" ? "active" : ""}`}
                      onClick={() => setIssueFilter("all")}
                    >
                      All ({issues.length})
                    </button>
                    <button
                      className={`issue-filter-btn ${issueFilter === "open" ? "active" : ""}`}
                      onClick={() => setIssueFilter("open")}
                    >
                      Open ({issues.filter((i) => i.status === "open").length})
                    </button>
                    <button
                      className={`issue-filter-btn ${issueFilter === "closed" ? "active" : ""}`}
                      onClick={() => setIssueFilter("closed")}
                    >
                      Closed ({issues.filter((i) => i.status === "closed").length})
                    </button>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => {
                      setNewIssueTitle("");
                      setNewIssueDesc("");
                      setIsIssueModalOpen(true);
                    }}
                  >
                    + New Issue
                  </button>
                </div>

                <div className="issues-list">
                  {filteredIssues.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                      No issues found matching this filter.
                    </div>
                  ) : (
                    filteredIssues.map((issue) => (
                      <div key={issue._id} className="issue-item">
                        <div className="issue-info">
                          <div className="issue-title">
                            <span
                              style={{ cursor: "pointer", color: "#58a6ff" }}
                              onClick={() => setSelectedIssue(issue)}
                            >
                              {issue.title}
                            </span>
                            <span className={`issue-status-badge ${issue.status}`}>
                              {issue.status}
                            </span>
                            {(issue.comments || []).length > 0 && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#8b949e",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                💬 {issue.comments.length}
                              </span>
                            )}
                          </div>
                          {issue.description && (
                            <p className="issue-desc">{issue.description}</p>
                          )}
                          <div className="issue-meta">
                            Created: {new Date(issue.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ marginTop: "8px" }}>
                            <ReactionPicker
                              reactions={issue.reactions}
                              currentUserId={currentUserId}
                              onReact={(emoji) => handleReactIssue(issue._id, emoji)}
                            />
                          </div>
                        </div>

                        <div className="issue-actions">
                          <button
                            className="btn-secondary"
                            style={{ fontSize: "0.82rem" }}
                            onClick={() => setSelectedIssue(issue)}
                          >
                            Open →
                          </button>
                          <button
                            className="btn-secondary"
                            onClick={() => handleToggleIssueStatus(issue._id, issue.status)}
                          >
                            {issue.status === "open" ? "Close" : "Reopen"}
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDeleteIssue(issue._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </main>
        )}

        {/* TAB 5: ACTIONS / CI */}
        {activeTab === "actions" && (
          <main>
            <div className="commits-header-row">
              <div>
                <h3 style={{ margin: 0, color: "#f0f6fc" }}>Workflow Runs</h3>
                <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                  CI/CD pipeline execution history for this repository
                </span>
              </div>
              <button
                className="btn-primary"
                onClick={() => setIsDispatchModalOpen(true)}
              >
                ▶ Run Workflow
              </button>
            </div>

            {actionsLoading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                Loading workflow runs...
              </div>
            ) : actionsRuns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                <p>No workflow runs yet. Trigger a manual dispatch or push a commit to get started.</p>
              </div>
            ) : (
              <div className="commits-timeline" style={{ marginTop: "16px" }}>
                {actionsRuns.map((run) => {
                  const statusColor =
                    run.conclusion === "success" ? "#3fb950"
                    : run.conclusion === "failure" ? "#f85149"
                    : run.status === "in_progress" ? "#d29922"
                    : "#8b949e";
                  const statusLabel =
                    run.status === "in_progress" ? "In Progress"
                    : run.conclusion === "success" ? "Success"
                    : run.conclusion === "failure" ? "Failed"
                    : run.conclusion === "cancelled" ? "Cancelled"
                    : run.status === "queued" ? "Queued"
                    : run.status || "Unknown";
                  return (
                    <div
                      key={run._id}
                      className="commit-row"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setSelectedRun(selectedRun?._id === run._id ? null : run)
                      }
                    >
                      <div className="commit-info">
                        <div className="commit-title-row">
                          <span
                            style={{
                              display: "inline-block",
                              width: "10px",
                              height: "10px",
                              borderRadius: "50%",
                              backgroundColor: statusColor,
                              marginRight: "8px",
                              flexShrink: 0,
                            }}
                          />
                          <span className="commit-message">{run.name || "Workflow Run"}</span>
                          <span
                            className="commit-badge-branch"
                            style={{ color: statusColor, borderColor: statusColor }}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="commit-meta">
                          <span>Branch: <code>{run.branch || "main"}</code></span>
                          <span className="meta-sep">&bull;</span>
                          <span>Trigger: {run.event || "push"}</span>
                          {run.durationMs && (
                            <>
                              <span className="meta-sep">&bull;</span>
                              <span>{(run.durationMs / 1000).toFixed(1)}s</span>
                            </>
                          )}
                          <span className="meta-sep">&bull;</span>
                          <span>{new Date(run.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: "0.8rem" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRerunWorkflow(run._id);
                        }}
                        title="Re-run this workflow"
                      >
                        ↺ Re-run
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expanded run steps panel */}
            {selectedRun && (
              <div
                style={{
                  marginTop: "16px",
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  borderRadius: "8px",
                  padding: "16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <h4 style={{ margin: 0, color: "#f0f6fc" }}>
                    {selectedRun.name || "Workflow"} — Steps
                  </h4>
                  <button
                    className="btn-secondary"
                    style={{ fontSize: "0.8rem" }}
                    onClick={() => setSelectedRun(null)}
                  >
                    ✕ Close
                  </button>
                </div>
                {(selectedRun.steps || []).length === 0 ? (
                  <p style={{ color: "#8b949e", fontSize: "0.85rem" }}>No step details available.</p>
                ) : (
                  (selectedRun.steps || []).map((step, idx) => {
                    const sc =
                      step.conclusion === "success" ? "#3fb950"
                      : step.conclusion === "failure" ? "#f85149"
                      : "#8b949e";
                    return (
                      <div
                        key={idx}
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid #21262d",
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start",
                        }}
                      >
                        <span style={{ color: sc, fontSize: "0.85rem", minWidth: "70px" }}>
                          {step.conclusion === "success" ? "✔ Pass"
                            : step.conclusion === "failure" ? "✘ Fail"
                            : "● " + (step.status || "pending")}
                        </span>
                        <div>
                          <div style={{ color: "#c9d1d9", fontSize: "0.9rem" }}>{step.name}</div>
                          {step.logs && (
                            <pre
                              style={{
                                marginTop: "6px",
                                backgroundColor: "#161b22",
                                padding: "8px",
                                borderRadius: "4px",
                                fontSize: "0.78rem",
                                color: "#8b949e",
                                overflowX: "auto",
                                maxHeight: "120px",
                              }}
                            >
                              {step.logs}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Dispatch Workflow Modal */}
            {isDispatchModalOpen && (
              <div className="modal-overlay" onClick={() => setIsDispatchModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Dispatch Workflow Manually</h3>
                  <form onSubmit={handleDispatchWorkflow}>
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Target Branch
                      </label>
                      <select
                        value={dispatchBranch}
                        onChange={(e) => setDispatchBranch(e.target.value)}
                        className="pr-branch-select"
                        style={{ width: "100%" }}
                      >
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsDispatchModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        ▶ Dispatch
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        )}

        {/* TAB 6: RELEASES */}
        {activeTab === "releases" && (
          <main>
            <div className="commits-header-row">
              <div>
                <h3 style={{ margin: 0, color: "#f0f6fc" }}>Releases</h3>
                <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                  Published versions and changelogs for this repository
                </span>
              </div>
              {isOwner && (
                <button
                  className="btn-primary"
                  onClick={() => setIsNewReleaseModalOpen(true)}
                >
                  + Draft New Release
                </button>
              )}
            </div>

            {releases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                <p>No releases published yet.</p>
                {isOwner && (
                  <button
                    className="btn-secondary"
                    style={{ marginTop: "12px" }}
                    onClick={() => setIsNewReleaseModalOpen(true)}
                  >
                    Create the first release
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {releases.map((rel, idx) => (
                  <div
                    key={rel._id}
                    style={{
                      backgroundColor: "#0d1117",
                      border: "1px solid #30363d",
                      borderRadius: "8px",
                      padding: "20px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                          <span
                            style={{
                              backgroundColor: "#1f6feb",
                              color: "#fff",
                              padding: "2px 10px",
                              borderRadius: "20px",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                              fontWeight: 600,
                            }}
                          >
                            🏷 {rel.tagName}
                          </span>
                          {idx === 0 && (
                            <span
                              style={{
                                backgroundColor: "#238636",
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                              }}
                            >
                              Latest
                            </span>
                          )}
                          {rel.isPrerelease && (
                            <span
                              style={{
                                backgroundColor: "#bb8009",
                                color: "#fff",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                              }}
                            >
                              Pre-release
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: "8px 0 4px 0", color: "#f0f6fc", fontSize: "1.1rem" }}>
                          {rel.name || rel.tagName}
                        </h3>
                        <div style={{ fontSize: "0.82rem", color: "#8b949e", marginBottom: "10px" }}>
                          Released on {new Date(rel.createdAt).toLocaleDateString()} &bull; Branch:{" "}
                          <code>{rel.targetBranch || "main"}</code>
                        </div>
                        {rel.body && (
                          <p
                            style={{
                              color: "#c9d1d9",
                              fontSize: "0.9rem",
                              lineHeight: 1.6,
                              whiteSpace: "pre-wrap",
                              margin: 0,
                            }}
                          >
                            {rel.body}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <a
                          href={`${api.defaults.baseURL}/repo/${id}/releases/${rel._id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary"
                          style={{ textDecoration: "none", fontSize: "0.82rem" }}
                        >
                          ⬇ Download
                        </a>
                        {isOwner && (
                          <button
                            className="btn-secondary"
                            style={{ color: "#f85149", borderColor: "#da3633", fontSize: "0.82rem" }}
                            onClick={() => handleDeleteRelease(rel._id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Release Modal */}
            {isNewReleaseModalOpen && (
              <div className="modal-overlay" onClick={() => setIsNewReleaseModalOpen(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>Draft New Release</h3>
                  <form onSubmit={handleCreateRelease}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Tag Name * <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>(e.g. v1.0.0)</span>
                      </label>
                      <input
                        type="text"
                        value={newReleaseTag}
                        onChange={(e) => setNewReleaseTag(e.target.value)}
                        placeholder="v1.0.0"
                        required
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: "6px",
                          border: "1px solid #30363d", backgroundColor: "#0d1117",
                          color: "#c9d1d9", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Release Title
                      </label>
                      <input
                        type="text"
                        value={newReleaseTitle}
                        onChange={(e) => setNewReleaseTitle(e.target.value)}
                        placeholder="e.g. Initial Release"
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: "6px",
                          border: "1px solid #30363d", backgroundColor: "#0d1117",
                          color: "#c9d1d9", boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Target Branch
                      </label>
                      <select
                        value={newReleaseBranch}
                        onChange={(e) => setNewReleaseBranch(e.target.value)}
                        className="pr-branch-select"
                        style={{ width: "100%" }}
                      >
                        {branches.map((b) => (
                          <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Release Notes / Changelog
                      </label>
                      <textarea
                        rows={5}
                        value={newReleaseBody}
                        onChange={(e) => setNewReleaseBody(e.target.value)}
                        placeholder="Describe what's new in this release..."
                        style={{
                          width: "100%", padding: "8px 12px", borderRadius: "6px",
                          border: "1px solid #30363d", backgroundColor: "#0d1117",
                          color: "#c9d1d9", boxSizing: "border-box", fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        id="prerelease-check"
                        checked={newReleasePrerelease}
                        onChange={(e) => setNewReleasePrerelease(e.target.checked)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <label htmlFor="prerelease-check" style={{ fontSize: "0.9rem", cursor: "pointer" }}>
                        This is a pre-release
                      </label>
                    </div>
                    <div className="modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsNewReleaseModalOpen(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary">
                        Publish Release
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </main>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === "settings" && isOwner && (
          <main className="settings-tab">
            {settingsMessage && (
              <div className="settings-alert-success">{settingsMessage}</div>
            )}

            <section className="settings-section">
              <h3>Repository Details</h3>
              <form onSubmit={handleUpdateDescription}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Short description about this project..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </form>
            </section>

            <section className="settings-section">
              <h3>Visibility</h3>
              <p style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "12px" }}>
                Current visibility: <strong>{repo.visibility}</strong>.
              </p>
              <button className="btn-secondary" onClick={handleToggleVisibility}>
                Make {repo.visibility === "public" ? "Private" : "Public"}
              </button>
            </section>

            <section className="settings-section">
              <h3>Manage Collaborators</h3>
              <p style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "14px" }}>
                Invite collaborators to this repository with read, write, or admin permissions.
              </p>

              {/* Add Collaborator Form */}
              <form onSubmit={handleAddCollaborator} style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder="Enter username to invite..."
                  value={newCollabUsername}
                  onChange={(e) => setNewCollabUsername(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: "180px",
                    padding: "7px 12px",
                    borderRadius: "6px",
                    border: "1px solid #30363d",
                    backgroundColor: "#0d1117",
                    color: "#c9d1d9",
                    fontSize: "0.88rem",
                  }}
                />
                <select
                  value={newCollabRole}
                  onChange={(e) => setNewCollabRole(e.target.value)}
                  className="pr-branch-select"
                >
                  <option value="write">Write (can push/PR)</option>
                  <option value="read">Read (view only)</option>
                  <option value="admin">Admin (full access)</option>
                </select>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={collabLoading || !newCollabUsername.trim()}
                >
                  {collabLoading ? "Adding..." : "+ Add Collaborator"}
                </button>
              </form>

              {/* Collaborators List */}
              <div className="collaborators-card-list">
                {collaborators.length === 0 ? (
                  <div style={{ fontSize: "0.85rem", color: "#8b949e", padding: "8px 0" }}>
                    No outside collaborators have been added yet.
                  </div>
                ) : (
                  collaborators.map((c) => {
                    const collabUser = c.user;
                    if (!collabUser) return null;
                    return (
                      <div key={collabUser._id} className="collaborator-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span className="comment-avatar-placeholder" style={{ backgroundColor: "#1f6feb" }}>
                            {collabUser.username ? collabUser.username[0].toUpperCase() : "U"}
                          </span>
                          <div>
                            <strong style={{ color: "#f0f6fc", fontSize: "0.9rem" }}>
                              {collabUser.username}
                            </strong>
                            <span style={{ fontSize: "0.78rem", color: "#8b949e", marginLeft: "8px" }}>
                              {collabUser.email}
                            </span>
                          </div>
                          <span className="branch-default-badge" style={{ textTransform: "capitalize", marginLeft: "6px" }}>
                            {c.role}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ color: "#ff7b72", borderColor: "#da3633" }}
                          onClick={() => handleRemoveCollaborator(collabUser._id)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* WEBHOOKS MANAGEMENT SECTION */}
            <section className="settings-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ margin: "0 0 4px 0" }}>Webhooks</h3>
                  <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: 0 }}>
                    Deliver HTTP POST payloads to external URLs on push, issue, and PR events with HMAC signatures.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsAddWebhookModalOpen(true)}
                >
                  Add webhook
                </button>
              </div>

              {webhooks.length === 0 ? (
                <p style={{ color: "#8b949e", fontSize: "0.85rem" }}>No webhooks configured for this repository.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {webhooks.map((wh) => (
                    <div
                      key={wh._id}
                      style={{
                        backgroundColor: "#0d1117",
                        border: "1px solid #30363d",
                        borderRadius: "6px",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ color: "#3fb950", fontSize: "0.85rem" }}>●</span>
                          <strong style={{ color: "#58a6ff", fontFamily: "monospace" }}>{wh.url}</strong>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                          Events: {(wh.events || []).join(", ")} • {wh.deliveries?.length || 0} deliveries logged
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem" }}
                          onClick={() => handleTestWebhook(wh._id)}
                        >
                          Send ping
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ fontSize: "0.8rem" }}
                          onClick={() => setSelectedDeliveries(wh.deliveries || [])}
                        >
                          Deliveries
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ color: "#f85149", borderColor: "#da3633", fontSize: "0.8rem" }}
                          onClick={() => handleDeleteWebhook(wh._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="settings-section danger-zone">
              <h3 style={{ color: "#ff7b72" }}>Danger Zone</h3>
              <p style={{ fontSize: "0.85rem", color: "#8b949e", marginBottom: "12px" }}>
                Once you delete a repository, there is no going back. Please be certain.
              </p>
              <button className="btn-danger" onClick={handleDeleteRepository}>
                Delete Repository
              </button>
            </section>
          </main>
        )}

        {/* MODAL: ADD / EDIT FILE */}
        {isFileModalOpen && (
          <div className="modal-overlay" onClick={() => setIsFileModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Commit File to '{activeBranch}'</h3>
              <form onSubmit={handleAddFile}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    File Path *
                  </label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. README.md, src/index.js, config.json"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    File Content
                  </label>
                  <textarea
                    rows={8}
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    placeholder="Type or paste your code or markdown here..."
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#79c0ff",
                      boxSizing: "border-box",
                      fontFamily: "monospace",
                      fontSize: "0.88rem",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Commit Message
                  </label>
                  <input
                    type="text"
                    value={newFileCommitMsg}
                    onChange={(e) => setNewFileCommitMsg(e.target.value)}
                    placeholder="e.g. Create README.md or feat: add entrypoint"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsFileModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Commit to {activeBranch}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: RECORD COMMIT */}
        {isCommitModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCommitModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Record Commit Snapshot on '{activeBranch}'</h3>
              <form onSubmit={handleCreateCommit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Commit Message *
                  </label>
                  <input
                    type="text"
                    value={newCommitMsg}
                    onChange={(e) => setNewCommitMsg(e.target.value)}
                    placeholder="e.g. feat: implement cloud backup"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Files Changed (comma separated)
                  </label>
                  <input
                    type="text"
                    value={newCommitFilesInput}
                    onChange={(e) => setNewCommitFilesInput(e.target.value)}
                    placeholder="e.g. main.js, styles.css, README.md"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsCommitModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Record Commit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CREATE ISSUE */}
        {isIssueModalOpen && (
          <div className="modal-overlay" onClick={() => setIsIssueModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Create New Issue</h3>
              <form onSubmit={handleCreateIssue}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newIssueTitle}
                    onChange={(e) => setNewIssueTitle(e.target.value)}
                    placeholder="Issue title"
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={newIssueDesc}
                    onChange={(e) => setNewIssueDesc(e.target.value)}
                    placeholder="Describe the issue or bug..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsIssueModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Submit Issue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: WEBHOOK DELIVERIES */}
        {selectedDeliveries !== null && (
          <div className="modal-overlay" onClick={() => setSelectedDeliveries(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "700px", width: "95%" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3 style={{ margin: 0 }}>Webhook Deliveries</h3>
                <button
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem" }}
                  onClick={() => setSelectedDeliveries(null)}
                >
                  ✕ Close
                </button>
              </div>
              {selectedDeliveries.length === 0 ? (
                <p style={{ color: "#8b949e" }}>No deliveries recorded yet for this webhook.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "60vh", overflowY: "auto" }}>
                  {selectedDeliveries.map((delivery, idx) => {
                    const isSuccess =
                      delivery.statusCode >= 200 && delivery.statusCode < 300;
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#0d1117",
                          border: `1px solid ${isSuccess ? "#238636" : "#da3633"}`,
                          borderRadius: "6px",
                          padding: "12px 14px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "6px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span
                              style={{
                                color: isSuccess ? "#3fb950" : "#f85149",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                fontSize: "0.9rem",
                              }}
                            >
                              {delivery.statusCode || "—"}
                            </span>
                            <span
                              style={{
                                backgroundColor: isSuccess ? "#238636" : "#da3633",
                                color: "#fff",
                                padding: "1px 8px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                              }}
                            >
                              {isSuccess ? "Success" : "Failed"}
                            </span>
                            <code style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                              {delivery.event || "push"}
                            </code>
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "#8b949e" }}>
                            {delivery.deliveredAt
                              ? new Date(delivery.deliveredAt).toLocaleString()
                              : ""}
                          </span>
                        </div>
                        {delivery.responseBody && (
                          <pre
                            style={{
                              margin: 0,
                              backgroundColor: "#161b22",
                              padding: "8px",
                              borderRadius: "4px",
                              fontSize: "0.78rem",
                              color: "#8b949e",
                              overflowX: "auto",
                              maxHeight: "100px",
                            }}
                          >
                            {delivery.responseBody}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: NEW PULL REQUEST */}
        <NewPullRequestModal
          isOpen={isNewPRModalOpen}
          onClose={() => setIsNewPRModalOpen(false)}
          repoId={id}
          branches={branches}
          defaultBase={repo?.defaultBranch || "main"}
          defaultHead={activeBranch}
          onCreated={(newPR) => {
            fetchRepoData();
            setSelectedPR(newPR);
          }}
        />
      </div>
    </>
  );
};

export default RepoDetail;
