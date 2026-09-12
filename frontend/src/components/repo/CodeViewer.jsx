import React, { useState } from "react";

const CodeViewer = ({ fileData, onClose, onEdit }) => {
  const [copied, setCopied] = useState(false);
  const [isRaw, setIsRaw] = useState(false);

  if (!fileData) return null;

  const { path: filePath = "file", content = "", size = 0, language = "plaintext" } = fileData;
  const lines = content.split(/\r?\n/);
  const lineCount = lines.length;
  const formattedSize = size > 1024 ? (size / 1024).toFixed(1) + " KB" : size + " Bytes";

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-viewer-container">
      {/* Header bar */}
      <div className="code-viewer-header">
        <div className="code-header-left">
          <button className="btn-icon" onClick={onClose} title="Back to file list">
            <svg height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
              <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z"></path>
            </svg>
          </button>
          <span className="code-filepath">{filePath}</span>
          <span className="code-meta-badge">{lineCount} lines</span>
          <span className="code-meta-badge">{formattedSize}</span>
          <span className="code-meta-badge" style={{ color: "#58a6ff" }}>{language}</span>
        </div>

        <div className="code-header-right">
          <button
            className={`btn-secondary btn-sm ${isRaw ? "active" : ""}`}
            onClick={() => setIsRaw(!isRaw)}
          >
            {isRaw ? "Formatted" : "Raw"}
          </button>
          <button className="btn-secondary btn-sm" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
          {onEdit && (
            <button className="btn-secondary btn-sm" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Code body */}
      {isRaw ? (
        <pre className="raw-code-view">{content}</pre>
      ) : (
        <div className="code-viewer-body">
          <table className="code-table">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="code-line-tr">
                  <td className="code-line-number" data-line-number={idx + 1}>
                    {idx + 1}
                  </td>
                  <td className="code-line-content">
                    <pre className="code-line-pre">
                      {line || " "}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CodeViewer;
