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
import "./repoDetail.css";

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

  const fetchRepoData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/repo/${id}`);
      const repoData = Array.isArray(res.data) ? res.data[0] : res.data;
      setRepo(repoData);
      setNewDescription(repoData?.description || "");

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
        <div style={{ textAlign: "center", padding: "60px", color: "#8b949e" }}>
          Loading SafeArchive repository...
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
          {isOwner && (
            <button
              className={`repo-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                setSelectedCommitDiff(null);
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
                    <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
                      No commits recorded on this branch yet.
                    </div>
                  ) : (
                    commits.map((commit) => (
                      <div key={commit.commitID} className="commit-row">
                        <div className="commit-info">
                          <div className="commit-title-row">
                            <span className="commit-message">{commit.message}</span>
                            <span className="commit-badge-branch">{commit.branch || "main"}</span>
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
                        {issue.title}
                        <span className={`issue-status-badge ${issue.status}`}>
                          {issue.status}
                        </span>
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
                        onClick={() => handleToggleIssueStatus(issue._id, issue.status)}
                      >
                        {issue.status === "open" ? "Close Issue" : "Reopen Issue"}
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
          </main>
        )}

        {/* TAB 5: SETTINGS */}
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
