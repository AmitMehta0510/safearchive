import React, { useEffect, useState } from "react";
import api from "../../config/api";

const CommitDiffViewer = ({ repoId, commitId, onClose }) => {
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoId || !commitId) return;

    const fetchDiff = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/repo/${repoId}/commits/${commitId}/diff`);
        setDiffData(res.data);
      } catch (err) {
        console.error("Error loading commit diff:", err);
        setError("Failed to load commit diff.");
      } finally {
        setLoading(false);
      }
    };

    fetchDiff();
  }, [repoId, commitId]);

  if (loading) {
    return (
      <div className="diff-loading-box">
        <div className="spinner-sm"></div>
        <span>Calculating commit diff...</span>
      </div>
    );
  }

  if (error || !diffData) {
    return (
      <div className="diff-error-box">
        <p>{error || "Diff unavailable for this commit."}</p>
        <button className="btn-secondary btn-sm" onClick={onClose}>Close</button>
      </div>
    );
  }

  const { commit, files = [], totalAdditions = 0, totalDeletions = 0 } = diffData;

  return (
    <div className="diff-viewer-wrapper">
      {/* Commit Summary Header */}
      <div className="diff-header-card">
        <div className="diff-header-top">
          <div>
            <h3 className="diff-commit-title">{commit.message}</h3>
            <div className="diff-commit-meta">
              <span>Commit <code>{(commit.commitID || "").slice(0, 8)}</code></span>
              <span>·</span>
              <span>{new Date(commit.date).toLocaleString()}</span>
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Back to Commits
          </button>
        </div>

        <div className="diff-stats-summary">
          <span className="diff-stat-item">
            <strong>{files.length}</strong> changed file{files.length !== 1 ? "s" : ""}
          </span>
          <span className="diff-stat-badge diff-stat-added">
            +{totalAdditions}
          </span>
          <span className="diff-stat-badge diff-stat-deleted">
            -{totalDeletions}
          </span>
        </div>
      </div>

      {/* Changed Files Diffs */}
      <div className="diff-files-list">
        {files.length === 0 ? (
          <div className="content-box" style={{ padding: "30px", textAlign: "center", color: "#8b949e" }}>
            No file modifications detected in this commit snapshot.
          </div>
        ) : (
          files.map((file) => (
            <div key={file.path} className="diff-file-card content-box">
              <div className="diff-file-header content-box-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={`diff-file-status-tag ${file.status}`}>
                    {file.status}
                  </span>
                  <span className="diff-file-path">{file.path}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", fontSize: "0.82rem" }}>
                  <span style={{ color: "#3fb950" }}>+{file.additions}</span>
                  <span style={{ color: "#f85149" }}>-{file.deletions}</span>
                </div>
              </div>

              {/* Line by line diff table */}
              <div className="diff-table-wrapper">
                <table className="diff-table">
                  <tbody>
                    {(file.lines || []).map((line, lIdx) => {
                      const isAdded = line.type === "added";
                      const isDeleted = line.type === "deleted";
                      const rowClass = isAdded ? "diff-line-added" : isDeleted ? "diff-line-deleted" : "diff-line-common";
                      const prefix = isAdded ? "+" : isDeleted ? "-" : " ";

                      return (
                        <tr key={lIdx} className={rowClass}>
                          <td className="diff-gutter-num old-num">
                            {line.oldLine || ""}
                          </td>
                          <td className="diff-gutter-num new-num">
                            {line.newLine || ""}
                          </td>
                          <td className="diff-gutter-marker">
                            {prefix}
                          </td>
                          <td className="diff-code-cell">
                            <pre className="diff-code-pre">{line.text || " "}</pre>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CommitDiffViewer;
