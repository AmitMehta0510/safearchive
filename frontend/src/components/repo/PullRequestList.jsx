import React from "react";

const PullRequestList = ({
  pullRequests = [],
  counts = { openCount: 0, closedCount: 0, mergedCount: 0, totalCount: 0 },
  activeFilter = "open",
  onChangeFilter,
  onSelectPR,
  onNewPR,
}) => {
  const getStatusIcon = (status) => {
    if (status === "merged") {
      return (
        <svg height="16" viewBox="0 0 16 16" width="16" fill="#a371f7" title="Merged">
          <path d="m5.45 5.154.002.094a2.25 2.25 0 0 0 1.942 2.234l.106.012h1.75a1.25 1.25 0 0 1 1.243 1.122l.007.128v1.01a2.25 2.25 0 1 0 1.5 0v-1.01a2.75 2.75 0 0 0-2.576-2.745l-.174-.005h-1.75a.75.75 0 0 1-.743-.648L6.75 5.25v-.378a2.25 2.25 0 1 0-1.5 0v.282h.2ZM4.75 3a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm7.5 9a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Z"></path>
        </svg>
      );
    }
    if (status === "closed") {
      return (
        <svg height="16" viewBox="0 0 16 16" width="16" fill="#f85149" title="Closed">
          <path d="M5.45 5.154A2.25 2.25 0 1 1 4.75 3.25a2.25 2.25 0 0 1 .7.424V5.25a.75.75 0 0 0 .75.75h1.75a2.75 2.75 0 0 1 2.745 2.576l.005.174v1.01a2.25 2.25 0 1 1-1.5 0v-1.01a1.25 1.25 0 0 0-1.122-1.243L9.25 7.5H6.2a2.25 2.25 0 0 1-.75-2.346ZM4.75 3a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm7.5 9a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
          <path d="m11.28 2.22-4 4a.75.75 0 0 0 1.06 1.06L12 3.56l3.66 3.66a.75.75 0 0 0 1.06-1.06l-4.72-4.72a.75.75 0 0 0-1.06 0l-.66.66.66.66-.66-.66Z"></path>
        </svg>
      );
    }
    // Default open
    return (
      <svg height="16" viewBox="0 0 16 16" width="16" fill="#3fb950" title="Open">
        <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.5 5.396V2.75a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.646L6.116 4.22a.75.75 0 0 1 1.06-1.146ZM14.5 12.75a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-11.5 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm0-9.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm9.5 9.5a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"></path>
      </svg>
    );
  };

  return (
    <div className="pr-list-container">
      {/* PR Controls Bar */}
      <div className="pr-header-bar">
        <div className="pr-filters-group">
          <button
            type="button"
            className={`pr-filter-btn ${activeFilter === "open" ? "active" : ""}`}
            onClick={() => onChangeFilter("open")}
          >
            <svg height="14" viewBox="0 0 16 16" width="14" fill="#3fb950">
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"></path>
            </svg>
            <span>{counts.openCount || 0} Open</span>
          </button>

          <button
            type="button"
            className={`pr-filter-btn ${activeFilter === "merged" ? "active" : ""}`}
            onClick={() => onChangeFilter("merged")}
          >
            <svg height="14" viewBox="0 0 16 16" width="14" fill="#a371f7">
              <path d="m5.45 5.154.002.094a2.25 2.25 0 0 0 1.942 2.234l.106.012h1.75a1.25 1.25 0 0 1 1.243 1.122l.007.128v1.01a2.25 2.25 0 1 0 1.5 0v-1.01a2.75 2.75 0 0 0-2.576-2.745l-.174-.005h-1.75a.75.75 0 0 1-.743-.648L6.75 5.25v-.378a2.25 2.25 0 1 0-1.5 0v.282h.2Z"></path>
            </svg>
            <span>{counts.mergedCount || 0} Merged</span>
          </button>

          <button
            type="button"
            className={`pr-filter-btn ${activeFilter === "closed" ? "active" : ""}`}
            onClick={() => onChangeFilter("closed")}
          >
            <svg height="14" viewBox="0 0 16 16" width="14" fill="#f85149">
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
            </svg>
            <span>{counts.closedCount || 0} Closed</span>
          </button>

          <button
            type="button"
            className={`pr-filter-btn ${activeFilter === "all" ? "active" : ""}`}
            onClick={() => onChangeFilter("all")}
          >
            All ({counts.totalCount || 0})
          </button>
        </div>

        <button type="button" className="btn-primary" onClick={onNewPR}>
          + New Pull Request
        </button>
      </div>

      {/* PR Rows */}
      <div className="pr-list-card">
        {pullRequests.length === 0 ? (
          <div className="pr-empty-box">
            <svg height="32" viewBox="0 0 16 16" width="32" fill="#8b949e" style={{ marginBottom: "12px" }}>
              <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Z"></path>
            </svg>
            <h3>No pull requests found</h3>
            <p style={{ color: "#8b949e", fontSize: "0.9rem", marginTop: "4px" }}>
              Pull requests let you tell others about changes you've pushed to a branch in SafeArchive.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: "16px" }}
              onClick={onNewPR}
            >
              Create pull request
            </button>
          </div>
        ) : (
          pullRequests.map((pr) => {
            const authorName = pr.author?.username || "user";
            const commentCount = pr.comments?.length || 0;
            const formattedDate = new Date(pr.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={pr._id}
                className="pr-item-row"
                onClick={() => onSelectPR(pr)}
              >
                <div className="pr-item-icon">{getStatusIcon(pr.status)}</div>

                <div className="pr-item-content">
                  <div className="pr-item-title-row">
                    <span className="pr-item-title">{pr.title}</span>
                    <span className="pr-branch-pill-group">
                      <span className="pr-branch-pill">{pr.sourceBranch}</span>
                      <span style={{ color: "#8b949e" }}>&rarr;</span>
                      <span className="pr-branch-pill">{pr.targetBranch}</span>
                    </span>
                  </div>

                  <div className="pr-item-meta">
                    #{pr.prNumber} opened on {formattedDate} by {authorName}
                    {pr.status === "merged" && pr.mergedBy && (
                      <span> &bull; Merged by {pr.mergedBy?.username || "user"}</span>
                    )}
                  </div>
                </div>

                {commentCount > 0 && (
                  <div className="pr-comment-badge" title={`${commentCount} comments`}>
                    <svg height="14" viewBox="0 0 16 16" width="14" fill="#8b949e">
                      <path d="M1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 13.25 12H9.06l-2.573 2.573A1.458 1.458 0 0 1 4 13.543V12H2.75A1.75 1.75 0 0 1 1 10.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h4.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path>
                    </svg>
                    <span>{commentCount}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PullRequestList;
