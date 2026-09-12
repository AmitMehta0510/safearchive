import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ReadmeViewer = ({ content, repoName }) => {
  if (!content) return null;

  return (
    <div className="readme-container content-box">
      {/* Readme Header */}
      <div className="content-box-header readme-header">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <svg height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
            <path d="M0 1.75A.75.75 0 0 1 .75 1h4.253c1.227 0 2.317.59 3 1.501A3.743 3.743 0 0 1 11.006 1h4.244a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75h-4.244a2.25 2.25 0 0 0-1.756.843l-.25.3a.75.75 0 0 1-1.15 0l-.25-.3A2.25 2.25 0 0 0 5.003 13H.75a.75.75 0 0 1-.75-.75ZM1.5 2.5v9h3.503a3.75 3.75 0 0 1 3 1.54 3.75 3.75 0 0 1 3-1.54h3.497v-9h-3.497a2.25 2.25 0 0 0-1.756.843l-.25.3a.75.75 0 0 1-1.15 0l-.25-.3A2.25 2.25 0 0 0 5.003 2.5Z"></path>
          </svg>
          <span style={{ fontWeight: 600, color: "#f0f6fc", fontSize: "0.9rem" }}>
            README.md
          </span>
        </div>
      </div>

      {/* Markdown Body */}
      <div className="readme-markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ReadmeViewer;
