import React, { useState, useRef, useEffect } from "react";

const AVAILABLE_EMOJIS = [
  { emoji: "👍", label: "thumbs up" },
  { emoji: "👎", label: "thumbs down" },
  { emoji: "❤️", label: "heart" },
  { emoji: "🚀", label: "rocket" },
  { emoji: "🎉", label: "tada" },
  { emoji: "👀", label: "eyes" },
];

const ReactionPicker = ({ reactions = [], currentUserId, onReact }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const handleSelectEmoji = async (emoji) => {
    setIsMenuOpen(false);
    if (onReact) {
      await onReact(emoji);
    }
  };

  const activeReactions = (reactions || []).filter((r) => r.users && r.users.length > 0);

  return (
    <div className="reaction-picker-wrapper" ref={menuRef}>
      <div className="reaction-pills-list">
        {activeReactions.map((r) => {
          const hasReacted = (r.users || []).some((u) => {
            const uId = typeof u === "object" ? u._id || u.id : u;
            return uId?.toString() === currentUserId?.toString();
          });

          const userNames = (r.users || [])
            .map((u) => (typeof u === "object" ? u.username : "someone"))
            .filter(Boolean)
            .join(", ");

          return (
            <button
              key={r.emoji}
              type="button"
              className={`reaction-pill ${hasReacted ? "active" : ""}`}
              onClick={() => handleSelectEmoji(r.emoji)}
              title={userNames ? `Reacted by: ${userNames}` : `React ${r.emoji}`}
            >
              <span className="reaction-emoji">{r.emoji}</span>
              <span className="reaction-count">{r.users.length}</span>
            </button>
          );
        })}

        {/* Add reaction trigger */}
        <button
          type="button"
          className="btn-add-reaction"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          title="Add a reaction"
        >
          <svg
            height="14"
            viewBox="0 0 16 16"
            width="14"
            fill="currentColor"
            style={{ opacity: 0.8 }}
          >
            <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.75-2.25a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0Zm4.5 0a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0ZM4.72 9.78a.75.75 0 0 1 1.06-.06 3.5 3.5 0 0 0 4.44 0 .75.75 0 1 1 1 1.12 5 5 0 0 1-6.44 0 .75.75 0 0 1-.06-1.06Z"></path>
          </svg>
          <span style={{ fontSize: "0.78rem", marginLeft: "4px" }}>+</span>
        </button>
      </div>

      {isMenuOpen && (
        <div className="reaction-menu-popover">
          {AVAILABLE_EMOJIS.map((item) => (
            <button
              key={item.emoji}
              type="button"
              className="reaction-menu-item"
              onClick={() => handleSelectEmoji(item.emoji)}
              title={item.label}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReactionPicker;
