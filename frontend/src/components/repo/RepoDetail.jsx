import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../config/api";
import Navbar from "../Navbar";
import "./repoDetail.css";

const RepoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repo, setRepo] = useState(null);
  const [issues, setIssues] = useState([]);
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("code"); // "code" | "commits" | "issues" | "settings"

  // Issue Form & Filtering State
  const [issueFilter, setIssueFilter] = useState("all");
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [newIssueDesc, setNewIssueDesc] = useState("");

  // Code / File State
  const [newFileName, setNewFileName] = useState("");
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

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

  const fetchRepoData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/repo/${id}`);
      const repoData = Array.isArray(res.data) ? res.data[0] : res.data;
      setRepo(repoData);
      setNewDescription(repoData?.description || "");

      // Fetch issues
      const issueRes = await api.get(`/issue/repo/${id}`);
      setIssues(issueRes.data?.issues || issueRes.data || []);

      // Fetch commits
      const commitRes = await api.get(`/repo/${id}/commits`);
      setCommits(commitRes.data || []);

      // Check star status if logged in
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
  };

  useEffect(() => {
    fetchRepoData();
  }, [id]);

  // Handle New Issue Submission
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

  // Handle Issue Status Toggle
  const handleToggleIssueStatus = async (issueId, currentStatus) => {
    const nextStatus = currentStatus === "open" ? "closed" : "open";
    try {
      const res = await api.put(`/issue/update/${issueId}`, {
        status: nextStatus,
      });

      setIssues(
        issues.map((iss) => (iss._id === issueId ? res.data : iss))
      );
    } catch (err) {
      alert("Failed to update issue status.");
    }
  };

  // Handle Issue Deletion
  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;

    try {
      await api.delete(`/issue/delete/${issueId}`);
      setIssues(issues.filter((iss) => iss._id !== issueId));
    } catch (err) {
      alert("Failed to delete issue.");
    }
  };

  // Handle Adding File to Repo
  const handleAddFile = async (e) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    try {
      const res = await api.put(`/repo/update/${id}`, {
        content: newFileName.trim(),
      });

      setRepo(res.data.repository);
      setNewFileName("");
      setIsFileModalOpen(false);
    } catch (err) {
      alert("Failed to add file to repository.");
    }
  };

  // Handle Commit Creation
  const handleCreateCommit = async (e) => {
    e.preventDefault();
    if (!newCommitMsg.trim()) return;

    const filesArray = newCommitFilesInput
      ? newCommitFilesInput.split(",").map((f) => f.trim()).filter(Boolean)
      : (repo.content || []).slice(0, 3);

    // Generate short random hex ID or UUID
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

  // Handle Visibility Toggle
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

  // Handle Description Update
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

  // Handle Repository Deletion
  const handleDeleteRepository = async () => {
    const confirmName = window.prompt(
      `To confirm deletion, type '${repo.name}':`
    );
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

  // Handle Star / Unstar
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

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
                onClick={() => setIsFileModalOpen(true)}
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
            onClick={() => setActiveTab("code")}
          >
            Code
            <span className="tab-counter">{(repo.content || []).length}</span>
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
            onClick={() => setActiveTab("issues")}
          >
            Issues
            <span className="tab-counter">{openCount}</span>
          </button>
          {isOwner && (
            <button
              className={`repo-tab ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
            >
              Settings
            </button>
          )}
        </nav>

        {/* TAB 1: CODE & FILES */}
        {activeTab === "code" && (
          <main>
            {/* Quick Setup with SafeArchive CLI */}
            <section className="cli-banner">
              <h4>Quick Setup & Remote Sync with SafeArchive CLI</h4>
              <p style={{ fontSize: "0.85rem", color: "#8b949e", margin: "0 0 10px 0" }}>
                Connect your local workspace to this cloud repository:
              </p>
              <div className="cli-code-block">
                safearchive init<br />
                safearchive add .<br />
                safearchive commit "Initial commit"<br />
                safearchive push
              </div>
            </section>

            {/* File List Explorer */}
            <section className="content-box">
              <div className="content-box-header">
                <span>Repository Files ({repo.content?.length || 0})</span>
                <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>
                  Revision: Latest
                </span>
              </div>

              {!repo.content || repo.content.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "#8b949e" }}>
                  <p>No files committed yet in this repository.</p>
                  <p style={{ fontSize: "0.85rem" }}>
                    Stage and push files using the SafeArchive CLI or click <strong>+ Add File</strong> above.
                  </p>
                </div>
              ) : (
                repo.content.map((file, idx) => (
                  <div key={idx} className="file-row">
                    <div
                      className="file-name"
                      onClick={() => setSelectedFile(file)}
                    >
                      <svg height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
                        <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l3.914 3.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 16h-10.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5Zm7.25.75v2.5c0 .138.112.25.25.25h2.5Z"></path>
                      </svg>
                      <span>{file}</span>
                    </div>
                    <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>
                      SafeArchive Verified
                    </span>
                  </div>
                ))
              )}
            </section>
          </main>
        )}

        {/* TAB 2: COMMITS EXPLORER */}
        {activeTab === "commits" && (
          <main>
            <div className="issues-toolbar">
              <div>
                <h4 style={{ margin: 0, color: "#f0f6fc" }}>
                  Commit Revision Timeline ({commits.length})
                </h4>
                <p style={{ margin: "4px 0 0 0", color: "#8b949e", fontSize: "0.85rem" }}>
                  Verified snapshots tracked in the SafeArchive cloud vault.
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
                  <div key={c._id || c.commitID} className="commit-row">
                    <div className="commit-main">
                      <h4 className="commit-message">{c.message}</h4>
                      <div className="commit-meta">
                        <span>{repo.owner?.username || "author"} committed</span>
                        <span>•</span>
                        <span>{new Date(c.date).toLocaleString()}</span>
                        {c.files && c.files.length > 0 && (
                          <>
                            <span>•</span>
                            <div>
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
                        title="Click to copy full commit ID"
                        onClick={() => {
                          navigator.clipboard?.writeText(c.commitID);
                          alert(`Copied commit ID: ${c.commitID}`);
                        }}
                      >
                        {(c.commitID || "").slice(0, 8)} 📋
                      </span>
                    </div>
                  </div>
                ))
              )}
            </section>
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
              </div>

              {filteredIssues.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#8b949e" }}>
                  <p>No {issueFilter !== "all" ? issueFilter : ""} issues found.</p>
                </div>
              ) : (
                filteredIssues.map((iss) => (
                  <div key={iss._id} className="issue-item">
                    <div className="issue-info">
                      <span
                        className={`status-indicator status-${iss.status}`}
                      >
                        {iss.status}
                      </span>
                      <div>
                        <h4 className="issue-title">{iss.title}</h4>
                        <p className="issue-desc">
                          {iss.description || "No description provided."}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleToggleIssueStatus(iss._id, iss.status)}
                      >
                        {iss.status === "open" ? "Close" : "Reopen"}
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ color: "#f85149" }}
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
          <main>
            {settingsMessage && (
              <div
                style={{
                  backgroundColor: "rgba(46, 160, 67, 0.15)",
                  border: "1px solid #2ea043",
                  color: "#3fb950",
                  padding: "10px 14px",
                  borderRadius: "6px",
                  marginBottom: "16px",
                }}
              >
                {settingsMessage}
              </div>
            )}

            {/* General Settings */}
            <section className="settings-section">
              <h3 style={{ color: "#f0f6fc", marginTop: 0 }}>General Settings</h3>

              <form onSubmit={handleUpdateDescription} style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
                  Repository Description
                </label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #30363d",
                      backgroundColor: "#0d1117",
                      color: "#c9d1d9",
                    }}
                  />
                  <button type="submit" className="btn-primary">
                    Save Description
                  </button>
                </div>
              </form>

              <hr style={{ borderColor: "#30363d", margin: "24px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#f0f6fc" }}>
                    Change Repository Visibility
                  </h4>
                  <p style={{ margin: 0, color: "#8b949e", fontSize: "0.85rem" }}>
                    This repository is currently <strong>{repo.visibility}</strong>.
                  </p>
                </div>
                <button className="btn-secondary" onClick={handleToggleVisibility}>
                  Make {repo.visibility === "public" ? "Private" : "Public"}
                </button>
              </div>
            </section>

            {/* Danger Zone */}
            <section className="settings-section danger-zone">
              <h4>Danger Zone</h4>
              <p style={{ color: "#8b949e", fontSize: "0.85rem", marginBottom: "16px" }}>
                Once you delete a repository, all files, issues, and metadata are permanently removed.
              </p>
              <button className="btn-danger" onClick={handleDeleteRepository}>
                Delete this repository
              </button>
            </section>
          </main>
        )}

        {/* MODAL: RECORD COMMIT */}
        {isCommitModalOpen && (
          <div className="modal-overlay" onClick={() => setIsCommitModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Record SafeArchive Commit</h3>
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

        {/* MODAL: ADD FILE */}
        {isFileModalOpen && (
          <div className="modal-overlay" onClick={() => setIsFileModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Add File to Repository</h3>
              <form onSubmit={handleAddFile}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
                    File Name / Path *
                  </label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. index.js, README.md, src/app.py"
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

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsFileModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add File
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: FILE PREVIEW */}
        {selectedFile && (
          <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
            <div className="modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
              <h3>File: {selectedFile}</h3>
              <div
                style={{
                  backgroundColor: "#0d1117",
                  border: "1px solid #30363d",
                  padding: "16px",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  color: "#79c0ff",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                // SafeArchive File Snapshot<br />
                // Path: {selectedFile}<br />
                // Status: Tracked in SafeArchive Vault
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSelectedFile(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RepoDetail;
