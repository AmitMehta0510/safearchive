import React, { useEffect, useState, useCallback } from "react";
import HeatMap from "@uiw/react-heat-map";
import Tooltip from "@uiw/react-tooltip";
import api from "../../config/api";
import socket from "../../config/socket";

// Thresholds for existColor:
// count 0 (< 1) -> #161b22 (dark empty)
// count 1-2 (< 3) -> #0e4429 (low)
// count 3-5 (< 6) -> #006d32 (medium)
// count 6-9 (< 10) -> #26a641 (high)
// count >= 10 -> #39d353 (max)
const PANEL_COLORS = {
  1: "#161b22",
  3: "#0e4429",
  6: "#006d32",
  10: "#26a641",
  15: "#39d353",
};

const LEGEND_COLORS = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

const formatTooltipDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return dateStr;
};

const getStartSunday = () => {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday, 6 is Saturday
  const thisSunday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - day);
  return new Date(thisSunday.getFullYear(), thisSunday.getMonth(), thisSunday.getDate() - 52 * 7);
};

const HeatMapProfile = ({ userId }) => {
  const [activityData, setActivityData] = useState([]);
  const [summary, setSummary] = useState({
    totalContributions: 0,
    currentStreak: 0,
    repoCount: 0,
    commitCount: 0,
    issueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const targetId = userId || localStorage.getItem("userId");

  const fetchContributions = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await api.get(`/user/contributions/${targetId}`);
      const rawData = res.data.data || [];
      // Normalize dates to YYYY/M/D to match @uiw/react-heat-map internal format
      const normalized = rawData.map((item) => ({
        ...item,
        date: item.date ? item.date.replace(/-/g, "/") : item.date,
      }));

      setActivityData(normalized);
      setSummary({
        totalContributions: res.data.totalContributions || 0,
        currentStreak: res.data.currentStreak || 0,
        repoCount: res.data.repoCount || 0,
        commitCount: res.data.commitCount || 0,
        issueCount: res.data.issueCount || 0,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching contributions:", err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  // Initial fetch
  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  // Real-time socket refresh: re-fetch whenever relevant activity fires
  useEffect(() => {
    if (!targetId) return;

    const REFRESH_EVENTS = [
      "commit_pushed",
      "repo_created",
      "issue_created",
      "repo_starred",
      "repo_unstarred",
    ];

    const handleActivity = (data) => {
      if (REFRESH_EVENTS.includes(data.type)) {
        setTimeout(() => fetchContributions(), 400);
      }
    };

    socket.on("activity", handleActivity);
    return () => socket.off("activity", handleActivity);
  }, [targetId, fetchContributions]);

  const formattedLastUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div style={{ textAlign: "left", width: "100%" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "14px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div>
          <h4 style={{ margin: "0 0 4px 0", color: "#f0f6fc", fontSize: "1.05rem" }}>
            Contribution Activity
          </h4>
          <span style={{ fontSize: "0.78rem", color: "#6e7681" }}>
            Last 365 days
            {formattedLastUpdated && (
              <span style={{ marginLeft: "10px", color: "#3fb950" }}>
                ● Live · updated {formattedLastUpdated}
              </span>
            )}
          </span>
        </div>

        {/* Streak badge */}
        {summary.currentStreak > 0 && (
          <div
            style={{
              backgroundColor: "#1c2128",
              border: "1px solid #30363d",
              borderRadius: "20px",
              padding: "4px 12px",
              fontSize: "0.82rem",
              color: "#e3b341",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🔥 {summary.currentStreak} day streak
          </div>
        )}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "Contributions", value: summary.totalContributions, color: "#3fb950" },
          { label: "Commits", value: summary.commitCount, color: "#58a6ff" },
          { label: "Repositories", value: summary.repoCount, color: "#a371f7" },
          { label: "Issues", value: summary.issueCount, color: "#e3b341" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "6px",
              padding: "8px 16px",
              textAlign: "center",
              minWidth: "85px",
            }}
          >
            <div
              style={{
                fontSize: "1.35rem",
                fontWeight: 700,
                color: stat.color,
                lineHeight: 1.2,
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#6e7681", marginTop: "2px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap container */}
      <div
        style={{
          backgroundColor: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px 20px 14px 20px",
          overflowX: "auto",
        }}
      >
        {loading ? (
          <div style={{ color: "#6e7681", fontSize: "0.9rem", padding: "20px 0" }}>
            Loading activity...
          </div>
        ) : (
          <div style={{ width: "825px" }}>
            <HeatMap
              className="HeatMapProfile"
              style={{ width: "825px", color: "#8b949e" }}
              width={825}
              value={activityData}
              weekLabels={["", "Mon", "", "Wed", "", "Fri", ""]}
              startDate={getStartSunday()}
              rectSize={12}
              space={3}
              rectProps={{ rx: 2 }}
              panelColors={PANEL_COLORS}
              rectRender={(props, data) => {
                const count = data.count || 0;
                const label =
                  count === 0
                    ? `No contributions on ${formatTooltipDate(data.date)}`
                    : `${count} contribution${count > 1 ? "s" : ""} on ${formatTooltipDate(data.date)}`;
                return (
                  <Tooltip placement="top" content={label}>
                    <rect {...props} />
                  </Tooltip>
                );
              }}
            />
          </div>
        )}

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "12px",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#6e7681", marginRight: "4px" }}>Less</span>
          {LEGEND_COLORS.map((color, i) => (
            <div
              key={i}
              style={{
                width: "11px",
                height: "11px",
                backgroundColor: color,
                borderRadius: "2px",
                border: color === "#161b22" ? "1px solid #30363d" : "none",
              }}
            />
          ))}
          <span style={{ fontSize: "0.72rem", color: "#6e7681", marginLeft: "4px" }}>More</span>
        </div>
      </div>
    </div>
  );
};

export default HeatMapProfile;
