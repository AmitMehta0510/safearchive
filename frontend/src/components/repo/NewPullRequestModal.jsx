import React, { useState, useEffect } from "react";
import api from "../../config/api";

const NewPullRequestModal = ({
  isOpen,
  onClose,
  repoId,
  branches = [],
  defaultBase = "main",
  defaultHead = "feature",
  onCreated,
}) => {
  const branchNames = (branches || []).map((b) => (typeof b === "string" ? b : b.name));

  const [baseBranch, setBaseBranch] = useState(defaultBase);
  const [headBranch, setHeadBranch] = useState(defaultHead);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diffData, setDiffData] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (defaultBase) setBaseBranch(defaultBase);
    if (defaultHead && defaultHead !== defaultBase) {
      setHeadBranch(defaultHead);
    } else {
      const nonBase = branchNames.find((b) => b !== defaultBase);
      if (nonBase) setHeadBranch(nonBase);
    }
  }, [defaultBase, defaultHead, isOpen]);

  // Compare branches whenever base or head changes
  useEffect(() => {
    if (!isOpen || !repoId || !baseBranch || !headBranch) return;
    if (baseBranch === headBranch) {
      setDiffData(null);
      return;
    }

    const fetchDiff = async () => {
      try {
        setComparing(true);
        setError("");
        const res = await api.get(
          `/repo/${repoId}/pulls/compare?base=${encodeURIComponent(baseBranch)}&head=${encodeURIComponent(headBranch)}`
        );
        setDiffData(res.data.diff);
      } catch (err) {
        console.error("Comparison error:", err);
        setError(err.response?.data?.error || "Could not compare branches");
        setDiffData(null);
      } finally {
        setComparing(false);
      }
    };

    fetchDiff();
  }, [isOpen, repoId, baseBranch, headBranch]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a pull request title");
      return;
    }
    if (baseBranch === headBranch) {
      setError("Base and compare branches must be different");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const res = await api.post(`/repo/${repoId}/pulls`, {
        title: title.trim(),
        description: description.trim(),
        sourceBranch: headBranch,
        targetBranch: baseBranch,
      });

      setTitle("");
      setDescription("");
      onClose();
      if (onCreated) {
        onCreated(res.data.pullRequest);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create pull request");
    } finally {
      setSubmitting(false);
    }
  };

  const isSameBranch = baseBranch === headBranch;
  const filesChangedCount = diffData?.totalFilesChanged || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pr-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="pr-modal-header">
          <h3>Open a Pull Request</h3>
          <button type="button" className="branch-menu-close" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Branch Selector Row */}
        <div className="pr-branch-compare-bar">
          <span style={{ fontSize: "0.88rem", color: "#8b949e", fontWeight: 500 }}>
            base:
          </span>
          <select
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            className="pr-branch-select"
          >
            {branchNames.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <span style={{ color: "#8b949e", margin: "0 4px" }}>&larr;</span>

          <span style={{ fontSize: "0.88rem", color: "#8b949e", fontWeight: 500 }}>
            compare:
          </span>
          <select
            value={headBranch}
            onChange={(e) => setHeadBranch(e.target.value)}
            className="pr-branch-select"
          >
            {branchNames.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
            {comparing ? (
              <span style={{ fontSize: "0.8rem", color: "#8b949e" }}>Comparing...</span>
            ) : isSameBranch ? (
              <span className="diff-warning-badge">Branches are identical</span>
            ) : (
              <span className="diff-ready-badge">
                &#10003; {filesChangedCount} file{filesChangedCount === 1 ? "" : "s"} changed
                {diffData && (
                  <span style={{ marginLeft: "6px" }}>
                    <span style={{ color: "#3fb950" }}>+{diffData.totalAdditions}</span>{" "}
                    <span style={{ color: "#f85149" }}>-{diffData.totalDeletions}</span>
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(248, 81, 73, 0.15)",
              border: "1px solid #f85149",
              color: "#ff7b72",
              padding: "10px 12px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "0.88rem",
            }}
          >
            {error}
          </div>
        )}

        {/* PR Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. Merge ${headBranch} into ${baseBranch}`}
              required
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #30363d",
                backgroundColor: "#0d1117",
                color: "#c9d1d9",
                boxSizing: "border-box",
                fontSize: "0.95rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontSize: "0.9rem" }}>
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Leave a comment describing the changes in this pull request..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "6px",
                border: "1px solid #30363d",
                backgroundColor: "#0d1117",
                color: "#c9d1d9",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Diff preview files pill list */}
          {diffData && diffData.files && diffData.files.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "0.82rem", color: "#8b949e", marginBottom: "6px" }}>
                Files to be merged:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {diffData.files.map((f) => (
                  <span key={f.path} className="pr-diff-file-tag">
                    {f.status === "added" && <span style={{ color: "#3fb950" }}>+ </span>}
                    {f.status === "deleted" && <span style={{ color: "#f85149" }}>- </span>}
                    {f.path}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || isSameBranch}
            >
              {submitting ? "Creating..." : "Create Pull Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewPullRequestModal;
