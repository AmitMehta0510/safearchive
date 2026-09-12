import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../config/api";
import Navbar from "../Navbar";
import FileTree from "./FileTree";
import CodeViewer from "./CodeViewer";
import ReadmeViewer from "./ReadmeViewer";
import CommitDiffViewer from "./CommitDiffViewer";
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
  const [activeTab, setActiveTab] = useState("code"); // "code" | "commits" | "issues" | "settings"

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

      const issueRes = await api.get(`/issue/repo/${id}`);
      setIssues(issueRes.data?.issues || issueRes.data || []);

      const commitRes = await api.get(`/repo/${id}/commits`);
      setCommits(commitRes.data || []);

      try {
        const treeRes = await api.get(`/repo/${id}/tree`);
        setTree(treeRes.data?.tree || []);
      } catch (treeErr) {
        console.warn("Tree fetch error:", treeErr);
      }

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
  }, [id, currentUserId]);

  useEffect(() => {
    fetchRepoData();
  }, [fetchRepoData]);

  useEffect(() => {
    if (!tree || tree.length === 0) return;
    const hasReadme = tree.some((item) =>
      item.path.toLowerCase().endsWith("readme.md")
    );
    if (hasReadme) {
      const readmePath = tree.find((item) =>
        item.path.toLowerCase().endsWith("readme.md")
      ).path;

      api
        .get(`/repo/${id}/file?path=${encodeURIComponent(readmePath)}`)
        .then((res) => {
          if (res.data?.content) {
            setReadmeContent(res.data.content);
          }
        })
        .catch(() => {});
    }
  }, [id, tree]);

  const handleSelectFile = async (filePath) => {
    try {
      setFileLoading(true);
      setSelectedFile(filePath);
      const res = await api.get(`/repo/${id}/file?path=${encodeURIComponent(filePath)}`);
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
    window.open(`${apiBase}/repo/${id}/archive/zip`, "_blank");
  };

  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      await api.post(`/repo/${id}/file`, {
        path: newFileName.trim(),
        content: newFileContent,
        message: newFileCommitMsg.trim() || `Create ${newFileName.trim()}`,
      });

      setNewFileName("");
      setNewFileContent("");
      setNewFileCommitMsg("");
      setIsFileModalOpen(false);
      fetchRepoData();
    } catch (err) {
      alert("Failed to save file: " + (err.response?.data?.error || err.message));
    }
  };
﻿  const handleCreateIssue = async (e) => {
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
      : (repo.content || []).slice(0, 3);

    const randomHex = Math.random().toString(16).substring(2, 10);

    try {
      const res = await api.post(`/repo/${id}/commit`, {
        commitID: randomHex,
        message: newCommitMsg.trim(),
        files: filesArray,
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

  if (loading) {
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
                title="Download repository as ZIP"
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
            onClick={() => setActiveTab("commits")}
          >
            Commits
            <span className="tab-counter">{commits.length}</span>
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
﻿        {/* TAB 1: CODE & FILES */}
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
                {/* File Tree Explorer */}
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
                />

                {/* README Markdown Section */}
                {readmeContent && (
                  <ReadmeViewer content={readmeContent} repoName={repo.name} />
                )}

                {/* Quick Setup with SafeArchive CLI */}
                <section className="cli-banner" style={{ marginTop: "24px" }}>
                  <h4>Quick Setup & Remote Sync with SafeArchive CLI</h4>
                  <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: "0 0 10px 0" }}>
                    Connect your local workspace to this cloud repository:
                  </p>
                  <div className="cli-code-block">
                    safearchive init<br />
                    safearchive remote {repo._id}<br />
                    safearchive add .<br />
                    safearchive commit "Initial commit"<br />
                    safearchive push
                  </div>
                </section>
              </>
            )}
          </main>
        )}

        {/* TAB 2: COMMITS EXPLORER */}
        {activeTab === "commits" && (
          <main>
            {selectedCommitDiff ? (
              <CommitDiffViewer
                repoId={id}
                commitId={selectedCommitDiff}
                onClose={() => setSelectedCommitDiff(null)}
              />
            ) : (
              <>
                <div className="issues-toolbar">
                  <div>
                    <h4 style={{ margin: 0, color: "#f0f6fc" }}>
                      Commit Revision Timeline ({commits.length})
                    </h4>
                    <p style={{ margin: "4px 0 0 0", color: "#8b949e", fontSize: "0.85rem" }}>
                      Click any commit to view visual file diffs and additions/deletions.
                    </p>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => setIsCommitModalOpen(true)}
                  >
                    + Record Commit
                  </button>
                </div>

                <section className="content-box">
                  <div className="content-box-header">
                    <span>Revision History</span>
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>Branch: main</span>
                  </div>

                  {commits.length === 0 ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#8b949e" }}>
                      <p>No commits recorded yet for this repository.</p>
                      <p style={{ fontSize: "0.85rem" }}>
                        Run <code>safearchive commit "message"</code> in your local workspace or click <strong>+ Record Commit</strong>.
                      </p>
                    </div>
                  ) : (
                    commits.map((c) => (
                      <div
                        key={c._id || c.commitID}
                        className="commit-row"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedCommitDiff(c.commitID)}
                        title="Click to view visual diff"
                      >
                        <div className="commit-main">
                          <h4 className="commit-message" style={{ color: "#58a6ff" }}>
                            {c.message}
                          </h4>
                          <div className="commit-meta">
                            <span>{repo.owner?.username || "author"} committed</span>
                            <span>·</span>
                            <span>{new Date(c.date).toLocaleString()}</span>
                            {c.files && c.files.length > 0 && (
                              <>
                                <span>·</span>
                                <div style={{ display: "inline-flex", gap: "4px", flexWrap: "wrap" }}>
                                  {c.files.map((f, i) => (
                                    <span key={i} className="file-tag">{f}</span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span
                            className="commit-hash-pill"
                            title="Click to view diff or copy"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard?.writeText(c.commitID);
                              setSelectedCommitDiff(c.commitID);
                            }}
                          >
                            {(c.commitID || "").slice(0, 8)} ↗
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </section>
              </>
            )}
          </main>
        )}

        {/* TAB 3: ISSUES */}
        {activeTab === "issues" && (
          <main>
            <div className="issues-toolbar">
              <div className="issue-filters">
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
                  Open ({openCount})
                </button>
                <button
                  className={`issue-filter-btn ${issueFilter === "closed" ? "active" : ""}`}
                  onClick={() => setIssueFilter("closed")}
                >
                  Closed ({issues.length - openCount})
                </button>
              </div>

              <button
                className="btn-primary"
                onClick={() => setIsIssueModalOpen(true)}
              >
                + New Issue
              </button>
            </div>

            <section className="content-box">
              <div className="content-box-header">
                <span>Issues Tracker</span>
                <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>
                  {filteredIssues.length} issue(s) shown
                </span>
              </div>

              {filteredIssues.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#8b949e" }}>
                  <p>No issues found for filter: "{issueFilter}".</p>
                </div>
              ) : (
                filteredIssues.map((iss) => (
                  <div key={iss._id} className="issue-row">
                    <div className="issue-main">
                      <div className="issue-title-line">
                        <span className={`status-badge ${iss.status}`}>
                          {iss.status === "open" ? "● Open" : "✓ Closed"}
                        </span>
                        <h4>{iss.title}</h4>
                      </div>
                      {iss.description && (
                        <p className="issue-desc">{iss.description}</p>
                      )}
                      <span className="issue-date">
                        Opened {new Date(iss.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="issue-actions">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleToggleIssueStatus(iss._id, iss.status)}
                      >
                        {iss.status === "open" ? "Close" : "Reopen"}
                      </button>
                      <button
                        className="btn-danger btn-sm"
                        onClick={() => handleDeleteIssue(iss._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </section>
          </main>
        )}

        {/* TAB 4: SETTINGS */}
        {activeTab === "settings" && isOwner && (
          <main className="settings-panel">
            {settingsMessage && (
              <div className="settings-toast">{settingsMessage}</div>
            )}

            <div className="settings-card">
              <h4>Repository Visibility</h4>
              <p style={{ color: "#8b949e", fontSize: "0.9rem" }}>
                Current status: <strong style={{ color: "#f0f6fc" }}>{repo.visibility}</strong>.
                {repo.visibility === "public"
                  ? " Anyone on the internet can see this vault."
                  : " Only you can access this vault."}
              </p>
              <button
                className="btn-secondary"
                onClick={handleToggleVisibility}
              >
                Switch to {repo.visibility === "public" ? "Private" : "Public"}
              </button>
            </div>

            <div className="settings-card">
              <h4>Repository Description</h4>
              <form onSubmit={handleUpdateDescription}>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your project..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #30363d",
                    backgroundColor: "#0d1117",
                    color: "#c9d1d9",
                    boxSizing: "border-box",
                    marginBottom: "12px",
                  }}
                />
                <button type="submit" className="btn-primary">
                  Save Description
                </button>
              </form>
            </div>

            <div className="settings-card danger-zone">
              <h4 style={{ color: "#f85149" }}>Danger Zone</h4>
              <p style={{ color: "#8b949e", fontSize: "0.9rem" }}>
                Once you delete a repository, there is no going back. All tracked snapshots and issues will be permanently removed.
              </p>
              <button className="btn-danger" onClick={handleDeleteRepository}>
                Delete this repository
              </button>
            </div>
          </main>
        )}

        {/* MODAL: ADD / EDIT FILE */}
        {isFileModalOpen && (
          <div className="modal-overlay" onClick={() => setIsFileModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: "680px" }} onClick={(e) => e.stopPropagation()}>
              <h3>Add or Edit File</h3>
              <form onSubmit={handleAddFile}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    File Name / Path *
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
                    Commit File
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
              <h3>Record Commit Snapshot</h3>
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
      </div>
    </>
  );
};

export default RepoDetail;
