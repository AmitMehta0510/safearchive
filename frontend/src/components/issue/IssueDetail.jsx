import React, { useState, useEffect, useCallback } from "react";
import api from "../../config/api";
import ReactionPicker from "../ReactionPicker";

const IssueDetail = ({ issueId, repoId, onBack, onUpdated }) => {
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const currentUserId = localStorage.getItem("userId");

  const fetchIssue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/issue/${issueId}`);
      setIssue(res.data.issue || res.data);
    } catch (err) {
      setError("Failed to load issue details.");
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setSubmitting(true);
      await api.post(`/issue/${issueId}/comments`, { content: newComment.trim() });
      setNewComment("");
      fetchIssue();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReact = async (emoji, commentId = null) => {
    try {
      const res = await api.post(`/issue/${issueId}/react`, { emoji, commentId });
      if (commentId) {
        setIssue((prev) => ({
          ...prev,
          comments: (prev.comments || []).map((c) =>
            c._id === commentId ? { ...c, reactions: res.data.reactions } : c
          ),
        }));
      } else {
        setIssue((prev) => ({ ...prev, reactions: res.data.reactions }));
      }
    } catch (err) {
      console.error("Error reacting:", err);
    }
  };

  const handleToggleStatus = async () => {
    const next = issue.status === "open" ? "closed" : "open";
    try {
      const res = await api.put(`/issue/update/${issueId}`, { status: next });
      setIssue(res.data);
      if (onUpdated) onUpdated();
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
        Loading issue...
      </div>
    );
  if (error || !issue)
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#f85149" }}>
        {error || "Issue not found."}
      </div>
    );

  const statusColor = issue.status === "open" ? "#3fb950" : "#8b949e";

  return (
    <div style={{ maxWidth: "860px" }}>
      <button
        className="btn-secondary"
        onClick={onBack}
        style={{ marginBottom: "20px", fontSize: "0.85rem" }}
      >
        Back to Issues
      </button>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: "#f0f6fc", flex: 1, fontSize: "1.3rem" }}>
            {issue.title}
          </h2>
          <span
            style={{
              backgroundColor: issue.status === "open" ? "#238636" : "#6e7681",
              color: "#fff",
              padding: "3px 12px",
              borderRadius: "20px",
              fontSize: "0.82rem",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            {issue.status}
          </span>
        </div>
        <div style={{ fontSize: "0.82rem", color: "#8b949e", marginTop: "8px" }}>
          Opened {new Date(issue.createdAt).toLocaleDateString()}
          {issue.author?.username && ` by ${issue.author.username}`}
          {" - "}
          {(issue.comments || []).length} comment(s)
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "16px 20px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
            paddingBottom: "10px",
            borderBottom: "1px solid #21262d",
          }}
        >
          <span
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#1f6feb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}
          >
            {issue.author?.username?.[0]?.toUpperCase() || "?"}
          </span>
          <strong style={{ color: "#c9d1d9" }}>{issue.author?.username || "Unknown"}</strong>
          <span style={{ color: "#8b949e", fontSize: "0.8rem" }}>
            {new Date(issue.createdAt).toLocaleString()}
          </span>
        </div>
        <p style={{ color: "#c9d1d9", margin: 0, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {issue.description || "No description provided."}
        </p>
        <div style={{ marginTop: "12px" }}>
          <ReactionPicker
            reactions={issue.reactions}
            currentUserId={currentUserId}
            onReact={(emoji) => handleReact(emoji, null)}
          />
        </div>
      </div>

      {(issue.comments || []).length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          {(issue.comments || []).map((comment) => (
            <div
              key={comment._id}
              style={{
                backgroundColor: "#161b22",
                border: "1px solid #30363d",
                borderRadius: "8px",
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "10px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid #21262d",
                }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    backgroundColor: "#388bfd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    flexShrink: 0,
                  }}
                >
                  {comment.author?.username?.[0]?.toUpperCase() || "?"}
                </span>
                <strong style={{ color: "#c9d1d9", fontSize: "0.9rem" }}>
                  {comment.author?.username || "Unknown"}
                </strong>
                <span style={{ color: "#8b949e", fontSize: "0.78rem" }}>
                  {new Date(comment.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ color: "#c9d1d9", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {comment.content}
              </p>
              <div style={{ marginTop: "8px" }}>
                <ReactionPicker
                  reactions={comment.reactions}
                  currentUserId={currentUserId}
                  onReact={(emoji) => handleReact(emoji, comment._id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          backgroundColor: "#161b22",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "16px 20px",
        }}
      >
        <h4 style={{ margin: "0 0 12px 0", color: "#f0f6fc", fontSize: "0.95rem" }}>
          Add a comment
        </h4>
        <form onSubmit={handleAddComment}>
          <textarea
            rows={4}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Leave a comment..."
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "6px",
              border: "1px solid #30363d",
              backgroundColor: "#0d1117",
              color: "#c9d1d9",
              boxSizing: "border-box",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              resize: "vertical",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <button type="button" className="btn-secondary" onClick={handleToggleStatus}>
              {issue.status === "open" ? "Close Issue" : "Reopen Issue"}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || !newComment.trim()}
            >
              {submitting ? "Submitting..." : "Comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueDetail;
