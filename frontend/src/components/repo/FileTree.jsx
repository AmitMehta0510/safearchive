import React, { useState } from "react";

const FileTree = ({ tree = [], onSelectFile, onAddFile, onDownloadZip, repoName }) => {
  const [currentDir, setCurrentDir] = useState("");

  // Filter items in current directory
  // e.g. if currentDir is "", items like "README.md" and "src" (if src/index.js exists)
  const dirPrefix = currentDir ? currentDir.replace(/\/$/, "") + "/" : "";

  // Group paths into entries inside current directory
  const entriesMap = new Map();

  tree.forEach((item) => {
    const fullPath = item.path || "";
    if (dirPrefix && !fullPath.startsWith(dirPrefix)) return;

    const relPath = dirPrefix ? fullPath.slice(dirPrefix.length) : fullPath;
    const parts = relPath.split("/");

    if (parts.length > 1) {
      // It's a folder
      const folderName = parts[0];
      const folderFullPath = dirPrefix + folderName;
      if (!entriesMap.has(folderName)) {
        entriesMap.set(folderName, {
          name: folderName,
          path: folderFullPath,
          type: "dir",
          lastCommitMessage: item.lastCommitMessage || "Update",
          lastModified: item.lastModified,
        });
      }
    } else {
      // It's a file
      entriesMap.set(parts[0], {
        ...item,
        name: parts[0],
        type: "file",
      });
    }
  });

  const entries = Array.from(entriesMap.values()).sort((a, b) => {
    // Folders first, then files alphabetically
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const handleGoUp = () => {
    const parts = currentDir.replace(/\/$/, "").split("/");
    parts.pop();
    setCurrentDir(parts.length > 0 ? parts.join("/") : "");
  };

  const breadcrumbs = currentDir ? currentDir.split("/").filter(Boolean) : [];

  return (
    <section className="file-tree-container">
      {/* Action bar: Branch switcher, breadcrumb, Download & Add File */}
      <div className="file-tree-toolbar">
        <div className="branch-selector">
          <svg height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
            <path d="M11.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm-2.25.75a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 8a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0-9a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
          </svg>
          <span style={{ fontWeight: 600, color: "#f0f6fc" }}>main</span>
        </div>

        {/* Directory breadcrumb navigation */}
        <div className="tree-breadcrumb">
          <span
            className={`crumb ${!currentDir ? "active" : ""}`}
            onClick={() => setCurrentDir("")}
          >
            {repoName || "root"}
          </span>
          {breadcrumbs.map((crumb, idx) => {
            const pathUpToHere = breadcrumbs.slice(0, idx + 1).join("/");
            return (
              <React.Fragment key={pathUpToHere}>
                <span className="crumb-sep">/</span>
                <span
                  className={`crumb ${idx === breadcrumbs.length - 1 ? "active" : ""}`}
                  onClick={() => setCurrentDir(pathUpToHere)}
                >
                  {crumb}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        <div className="tree-actions">
          {onAddFile && (
            <button className="btn-secondary btn-sm" onClick={onAddFile}>
              + Add File
            </button>
          )}
          {onDownloadZip && (
            <button className="btn-secondary btn-sm" onClick={onDownloadZip} title="Download ZIP">
              <svg height="14" viewBox="0 0 16 16" width="14" fill="#8b949e" style={{ marginRight: "5px" }}>
                <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"></path>
                <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.969a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.78a.749.749 0 1 1 1.06-1.06l1.97 1.969Z"></path>
              </svg>
              Download ZIP
            </button>
          )}
        </div>
      </div>

      {/* Files Table */}
      <div className="content-box tree-table-box">
        {/* If inside subfolder, render ".." row */}
        {currentDir && (
          <div className="file-row tree-row-folder" onClick={handleGoUp}>
            <div className="file-name">
              <span style={{ color: "#58a6ff", fontWeight: 600, fontSize: "1.1rem" }}>..</span>
              <span style={{ color: "#8b949e", fontSize: "0.85rem", marginLeft: "8px" }}>
                Go to parent directory
              </span>
            </div>
            <span></span>
            <span></span>
          </div>
        )}

        {entries.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#8b949e" }}>
            <p style={{ margin: "0 0 8px 0" }}>This repository currently has no files.</p>
            <p style={{ fontSize: "0.85rem", margin: 0 }}>
              Add a file via <strong>+ Add File</strong> or push code using the SafeArchive CLI.
            </p>
          </div>
        ) : (
          entries.map((item) => {
            const isDir = item.type === "dir";
            return (
              <div
                key={item.path || item.name}
                className={`file-row ${isDir ? "tree-row-folder" : "tree-row-file"}`}
                onClick={() => {
                  if (isDir) {
                    setCurrentDir(item.path);
                  } else {
                    onSelectFile(item.path);
                  }
                }}
              >
                <div className="file-name">
                  {isDir ? (
                    /* Folder Icon */
                    <svg height="16" viewBox="0 0 16 16" width="16" fill="#58a6ff">
                      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                    </svg>
                  ) : (
                    /* File Icon */
                    <svg height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
                      <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l3.914 3.914c.329.328.513.773.513 1.237v8.586A1.75 1.75 0 0 1 14.25 16h-10.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 10 4.25V1.5Zm7.25.75v2.5c0 .138.112.25.25.25h2.5Z"></path>
                    </svg>
                  )}
                  <span className={isDir ? "folder-label" : "file-label"}>{item.name}</span>
                </div>

                <span className="file-commit-msg" title={item.lastCommitMessage}>
                  {item.lastCommitMessage || "Update " + item.name}
                </span>

                <span className="file-date">
                  {item.lastModified
                    ? new Date(item.lastModified).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Latest"}
                </span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default FileTree;
