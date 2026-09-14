import React from "react";

/**
 * Skeleton — animated placeholder for loading states.
 * Usage: <Skeleton width="100%" height="16px" borderRadius="4px" />
 */
const Skeleton = ({
  width = "100%",
  height = "16px",
  borderRadius = "4px",
  style = {},
}) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: "linear-gradient(90deg, #21262d 25%, #30363d 50%, #21262d 75%)",
      backgroundSize: "200% 100%",
      animation: "skeleton-shimmer 1.4s ease-in-out infinite",
      flexShrink: 0,
      ...style,
    }}
  />
);

/**
 * SkeletonCard — a preset card-shaped loading block
 */
export const SkeletonCard = () => (
  <div
    style={{
      backgroundColor: "#161b22",
      border: "1px solid #30363d",
      borderRadius: "6px",
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Skeleton width="55%" height="14px" />
      <Skeleton width="50px" height="20px" borderRadius="12px" />
    </div>
    <Skeleton width="80%" height="12px" />
    <Skeleton width="40%" height="11px" />
  </div>
);

/**
 * SkeletonRepoHeader — placeholder for the RepoDetail header area
 */
export const SkeletonRepoHeader = () => (
  <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <Skeleton width="200px" height="24px" borderRadius="6px" />
      <Skeleton width="56px" height="20px" borderRadius="12px" />
    </div>
    <Skeleton width="60%" height="14px" />
    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
      {[100, 80, 110, 80, 90].map((w, i) => (
        <Skeleton key={i} width={`${w}px`} height="34px" borderRadius="6px" />
      ))}
    </div>
    <Skeleton width="100%" height="1px" style={{ marginTop: "8px" }} />
  </div>
);

/**
 * SkeletonProfileSidebar — placeholder for the Profile sidebar
 */
export const SkeletonProfileSidebar = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
    <Skeleton width="80px" height="80px" borderRadius="50%" />
    <Skeleton width="70%" height="18px" borderRadius="6px" />
    <Skeleton width="50%" height="13px" />
    <Skeleton width="90%" height="12px" />
    <Skeleton width="90%" height="12px" />
    <Skeleton width="75%" height="12px" />
  </div>
);

export default Skeleton;
