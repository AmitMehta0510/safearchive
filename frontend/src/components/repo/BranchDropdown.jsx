import React, { useState, useRef, useEffect } from "react";

const BranchDropdown = ({
  branches = [],
  activeBranch = "main",
  onSelectBranch,
  onCreateBranch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [creating, setCreating] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const branchList = (branches || []).map((b) => (typeof b === "string" ? b : b.name));
  const uniqueBranches = Array.from(new Set([activeBranch, ...branchList]));

  const filteredBranches = uniqueBranches.filter((b) =>
    b.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const cleanSearch = searchTerm.trim();
  const branchExists = uniqueBranches.some(
    (b) => b.toLowerCase() === cleanSearch.toLowerCase()
  );
  const canCreate = cleanSearch && !branchExists;

  const handleCreate = async () => {
    if (!canCreate || !onCreateBranch) return;
    try {
      setCreating(true);
      await onCreateBranch(cleanSearch);
      setSearchTerm("");
      setIsOpen(false);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to create branch");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="branch-dropdown-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className="btn-branch-switcher"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch branches"
      >
        <svg
          height="14"
          viewBox="0 0 16 16"
          width="14"
          fill="currentColor"
          style={{ marginRight: "6px", flexShrink: 0 }}
        >
          <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"></path>
        </svg>
        <span className="branch-name-label">{activeBranch}</span>
        <svg
          height="12"
          viewBox="0 0 16 16"
          width="12"
          fill="currentColor"
          style={{ marginLeft: "6px", opacity: 0.7 }}
        >
          <path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"></path>
        </svg>
      </button>

      {isOpen && (
        <div className="branch-menu-popover">
          <div className="branch-menu-header">
            <span>Switch branch</span>
            <button
              type="button"
              className="branch-menu-close"
              onClick={() => setIsOpen(false)}
            >
              &times;
            </button>
          </div>

          <div className="branch-menu-search">
            <input
              type="text"
              placeholder="Find or create a branch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>

          <div className="branch-list-items">
            {filteredBranches.map((branchName) => {
              const isCurrent = branchName === activeBranch;
              return (
                <div
                  key={branchName}
                  className={`branch-item-row ${isCurrent ? "active" : ""}`}
                  onClick={() => {
                    onSelectBranch(branchName);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <span className="branch-item-check">
                    {isCurrent && (
                      <svg height="14" viewBox="0 0 16 16" width="14" fill="#3fb950">
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                      </svg>
                    )}
                  </span>
                  <span className="branch-item-text">{branchName}</span>
                  {branchName === "main" && (
                    <span className="branch-default-badge">default</span>
                  )}
                </div>
              );
            })}

            {filteredBranches.length === 0 && !canCreate && (
              <div className="branch-empty">No branches found</div>
            )}

            {canCreate && (
              <div className="branch-create-action" onClick={handleCreate}>
                <svg height="14" viewBox="0 0 16 16" width="14" fill="#58a6ff">
                  <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
                </svg>
                <span>
                  {creating ? "Creating..." : `Create branch: `}
                  <strong>{cleanSearch}</strong>
                  <span style={{ display: "block", fontSize: "0.75rem", color: "#8b949e" }}>
                    from '{activeBranch}'
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchDropdown;
