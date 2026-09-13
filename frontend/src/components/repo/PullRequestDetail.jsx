import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import ReactionPicker from "../ReactionPicker";

const PullRequestDetail = ({ prId, repoId, onBack, onUpdated }) => {
  const [prData, setPrData] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("conversation"); // "conversation" | "files"
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [merging, setMerging] = useState(false);
  const [statusCheck, setStatusCheck] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [error, setError] = useState("");

  const currentUserId = localStorage.getItem("userId");

  const handleReact = async (emoji, commentId = null) => {
    try {
      const res = await api.post(`/repo/${repoId}/pulls/${prId}/react`, {
        emoji,
        commentId,
      });
      if (commentId) {
        setPrData((prev) => ({
          ...prev,
          comments: (prev.comments || []).map((c) =>
            c._id === commentId ? { ...c, reactions: res.data.reactions } : c
          ),
        }));
      } else {
        setPrData((prev) => ({
          ...prev,
          reactions: res.data.reactions,
        }));
      }
    } catch (err) {
      console.error("Error reacting to PR:", err);
    }
  };

  const fetchPR = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/repo/${repoId}/pulls/${prId}`);
      setPrData(res.data.pullRequest);
      setDiffData(res.data.diff);
    } catch (err) {
      console.error("Error fetching PR details:", err);
      setError("Failed to load pull request details.");
    } finally {
      setLoading(false);
    }
  }, [repoId, prId]);

  useEffect(() => {
    fetchPR();
  }, [fetchPR]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      const res = await api.post(`/repo/${repoId}/pulls/${prId}/comments`, {
        content: newComment.trim(),
      });
      setNewComment("");
      setPrData((prev) => ({
        ...prev,
        comments: res.data.comments || [...(prev.comments || []), res.data.comment],
      }));
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleMerge = async () => {
    if (!window.confirm(`Are you sure you want to merge PR #${prData.prNumber} into ${prData.targetBranch}?`)) {
      return;
    }

    try {
      setMerging(true);
      const res = await api.post(`/repo/${repoId}/pulls/${prId}/merge`);
      setPrData(res.data.pullRequest);
      if (onUpdated) onUpdated();
      alert("Pull request merged successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to merge pull request.");
    } finally {
      setMerging(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = prData.status === "open" ? "closed" : "open";
    try {
      setTogglingStatus(true);
      const res = await api.patch(`/repo/${repoId}/pulls/${prId}/status`, {
        status: nextStatus,
      });
      setPrData(res.data.pullRequest);
      if (onUpdated) onUpdated();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to change pull request status.");
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#8b949e" }}>
        Loading pull request details...
      </div>
    );
  }

  if (error || !prData) {
    return (
      <div style={{ textAlign: "center", padding: "60px", color: "#ff7b72" }}>
        <h3>{error || "Pull request not found"}</h3>
        <button type="button" className="btn-secondary" style={{ marginTop: "16px" }} onClick={onBack}>
          &larr; Back to Pull Requests
        </button>
      </div>
    );
  }

  const authorName = prData.author?.username || "user";
  const status = prData.status; // "open" | "closed" | "merged"
  const filesChanged = diffData?.totalFilesChanged || 0;
  const additions = diffData?.totalAdditions || 0;
  const deletions = diffData?.totalDeletions || 0;

  return (
    <div className="pr-detail-view">
      {/* Back Button */}
      <button type="button" className="btn-back-link" onClick={onBack}>
        &larr; Back to all pull requests
      </button>

      {/* PR Header */}
      <div className="pr-detail-header">
        <h1 className="pr-detail-title">
          {prData.title} <span className="pr-number-gray">#{prData.prNumber}</span>
        </h1>

        <div className="pr-status-row">
          <span className={`pr-status-pill ${status}`}>
            {status === "open" && (
              <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"></path>
              </svg>
            )}
            {status === "merged" && (
              <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                <path d="m5.45 5.154.002.094a2.25 2.25 0 0 0 1.942 2.234l.106.012h1.75a1.25 1.25 0 0 1 1.243 1.122l.007.128v1.01a2.25 2.25 0 1 0 1.5 0v-1.01a2.75 2.75 0 0 0-2.576-2.745l-.174-.005h-1.75a.75.75 0 0 1-.743-.648L6.75 5.25v-.378a2.25 2.25 0 1 0-1.5 0v.282h.2Z"></path>
              </svg>
            )}
            {status === "closed" && (
              <svg height="14" viewBox="0 0 16 16" width="14" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
              </svg>
            )}
            <span style={{ textTransform: "capitalize" }}>{status}</span>
          </span>

          <span className="pr-branch-statement">
            <strong>{authorName}</strong> wants to merge into{" "}
            <span className="pr-branch-pill">{prData.targetBranch}</span> from{" "}
            <span className="pr-branch-pill">{prData.sourceBranch}</span>
          </span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="pr-sub-tabs">
        <button
          type="button"
          className={`pr-sub-tab ${activeSubTab === "conversation" ? "active" : ""}`}
          onClick={() => setActiveSubTab("conversation")}
        >
          Conversation
          <span className="tab-counter">{(prData.comments?.length || 0) + 1}</span>
        </button>

        <button
          type="button"
          className={`pr-sub-tab ${activeSubTab === "files" ? "active" : ""}`}
          onClick={() => setActiveSubTab("files")}
        >
          Files changed
          <span className="tab-counter">{filesChanged}</span>
        </button>
      </div>

      {/* TAB CONTENT 1: CONVERSATION */}
      {activeSubTab === "conversation" && (
        <div className="pr-conversation-view">
          {/* Main Description Card */}
          <div className="comment-thread-card">
            <div className="comment-header">
              <span className="comment-avatar-placeholder">{authorName[0].toUpperCase()}</span>
              <strong>{authorName}</strong>
              <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                opened this pull request on {new Date(prData.createdAt).toLocaleString()}
              </span>
              <span className="comment-author-badge">Author</span>
            </div>
            <div className="comment-body">
              {prData.description ? (
                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{prData.description}</p>
              ) : (
                <em style={{ color: "#8b949e" }}>No description provided.</em>
              )}
              <div style={{ marginTop: "12px" }}>
                <ReactionPicker
                  reactions={prData.reactions}
                  currentUserId={currentUserId}
                  onReact={(emoji) => handleReact(emoji)}
                />
              </div>
            </div>
          </div>

          {/* Timeline of Review Comments */}
          {(prData.comments || []).map((comment, index) => {
            const commentAuthor = comment.author?.username || "user";
            return (
              <div key={comment._id || index} className="comment-thread-card">
                <div className="comment-header">
                  <span className="comment-avatar-placeholder">
                    {commentAuthor[0].toUpperCase()}
                  </span>
                  <strong>{commentAuthor}</strong>
                  <span style={{ color: "#8b949e", fontSize: "0.82rem" }}>
                    commented on {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="comment-body">
                  <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{comment.content}</p>
                  <div style={{ marginTop: "10px" }}>
                    <ReactionPicker
                      reactions={comment.reactions}
                      currentUserId={currentUserId}
                      onReact={(emoji) => handleReact(emoji, comment._id)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* AUTOMATED STATUS CHECKS BANNER */}
          {statusCheck && statusCheck.status !== "none" && (
            <div className={"pr-checks-box " + (statusCheck.status === "in_progress" || statusCheck.status === "queued" ? "pending" : statusCheck.conclusion === "success" ? "success" : "failure")}>
              <div className={"checks-icon-circle " + (statusCheck.status === "in_progress" || statusCheck.status === "queued" ? "amber" : statusCheck.conclusion === "success" ? "green" : "red")}>
                {statusCheck.status === "in_progress" || statusCheck.status === "queued" ? "⏳" : statusCheck.conclusion === "success" ? "✓" : "✕"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#f0f6fc", fontSize: "0.95rem" }}>
                    {statusCheck.status === "in_progress" || statusCheck.status === "queued"
                      ? "Some checks haven't completed yet"
                      : statusCheck.conclusion === "success"
                      ? "All checks have passed"
                      : "Some checks were not successful"}
                  </strong>
                  <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>
                    {statusCheck.durationMs ? (statusCheck.durationMs / 1000).toFixed(1) + "s" : ""}
                  </span>
                </div>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.85rem", color: "#8b949e" }}>
                  {statusCheck.conclusion === "success"
                    ? "1 successful check — " + (statusCheck.name || "CI Build & Test Suite") + " on " + statusCheck.branch
                    : statusCheck.status === "in_progress" || statusCheck.status === "queued"
                    ? "1 check in progress — " + (statusCheck.name || "CI Build & Test Suite") + " is running..."
                    : "1 failing check — " + (statusCheck.name || "CI Build & Test Suite") + " encountered errors"}
                </p>
              </div>
            </div>
          )}

          {/* MERGE / STATUS CARD */}
          <div className={`pr-merge-box status-${status}`}>
            {status === "open" && (
              <>
                <div className="pr-merge-info">
                  <div className="pr-merge-icon green">&#10003;</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", color: "#f0f6fc" }}>
                      This branch has no conflicts with the base branch
                    </h4>
                    <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                      Merging can be performed automatically to update {prData.targetBranch}.
                    </span>
                  </div>
                </div>

                <div className="pr-merge-actions">
                  <button
                    type="button"
                    className="btn-merge-primary"
                    disabled={merging}
                    onClick={handleMerge}
                  >
                    {merging ? "Merging..." : "Merge pull request"}
                  </button>

                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={togglingStatus}
                    onClick={handleToggleStatus}
                  >
                    Close pull request
                  </button>
                </div>
              </>
            )}

            {status === "merged" && (
              <div className="pr-merge-info">
                <div className="pr-merge-icon purple">&#10003;</div>
                <div>
                  <h4 style={{ margin: "0 0 4px 0", color: "#f0f6fc" }}>
                    Pull request successfully merged and closed
                  </h4>
                  <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                    You merged changes into {prData.targetBranch} on{" "}
                    {prData.mergedAt ? new Date(prData.mergedAt).toLocaleString() : "recently"}.
                  </span>
                </div>
              </div>
            )}

            {status === "closed" && (
              <div className="pr-merge-info" style={{ justifyContent: "space-between", width: "100%" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div className="pr-merge-icon red">&times;</div>
                  <div>
                    <h4 style={{ margin: "0 0 4px 0", color: "#f0f6fc" }}>
                      This pull request is closed
                    </h4>
                    <span style={{ fontSize: "0.85rem", color: "#8b949e" }}>
                      Changes were not merged into {prData.targetBranch}.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={togglingStatus}
                  onClick={handleToggleStatus}
                >
                  Reopen pull request
                </button>
              </div>
            )}
          </div>

          {/* Add Review Comment Form */}
          <form className="pr-new-comment-box" onSubmit={handleAddComment}>
            <div className="comment-header">
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Add a comment</span>
            </div>
            <textarea
              rows={4}
              placeholder="Leave a comment or review..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "12px",
                border: "none",
                backgroundColor: "#0d1117",
                color: "#c9d1d9",
                boxSizing: "border-box",
                fontFamily: "inherit",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <div style={{ padding: "8px 12px", display: "flex", justifyContent: "flex-end", backgroundColor: "#161b22", borderTop: "1px solid #30363d" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={submittingComment || !newComment.trim()}
              >
                {submittingComment ? "Posting..." : "Comment"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 2: FILES CHANGED DIFF */}
      {activeSubTab === "files" && (
        <div className="pr-files-view">
          <div className="pr-diff-summary-bar">
            <span>
              Showing <strong>{filesChanged} changed files</strong> with{" "}
              <strong style={{ color: "#3fb950" }}>+{additions} additions</strong> and{" "}
              <strong style={{ color: "#f85149" }}>-{deletions} deletions</strong>.
            </span>
          </div>

          {!diffData || !diffData.files || diffData.files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
              No file differences between these branches.
            </div>
          ) : (
            diffData.files.map((file) => (
              <div key={file.path} className="pr-diff-file-card">
                <div className="pr-diff-file-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className={`diff-status-pill ${file.status}`}>
                      {file.status}
                    </span>
                    <strong style={{ color: "#f0f6fc", fontFamily: "monospace" }}>
                      {file.path}
                    </strong>
                  </div>

                  <div className="diff-stats-pill">
                    <span style={{ color: "#3fb950" }}>+{file.additions}</span>
                    <span style={{ color: "#f85149" }}>-{file.deletions}</span>
                  </div>
                </div>

                <div className="pr-diff-code-body">
                  {(file.diffLines || []).map((line, lIdx) => (
                    <div key={lIdx} className={`diff-line-row ${line.type}`}>
                      <span className="diff-ln old-ln">{line.oldLine || ""}</span>
                      <span className="diff-ln new-ln">{line.newLine || ""}</span>
                      <span className="diff-prefix">
                        {line.type === "added" ? "+" : line.type === "deleted" ? "-" : " "}
                      </span>
                      <pre className="diff-line-text">{line.text}</pre>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PullRequestDetail;
