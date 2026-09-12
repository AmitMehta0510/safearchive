import React, { useEffect, useState, useCallback } from "react";
import HeatMap from "@uiw/react-heat-map";
import Tooltip from "@uiw/react-tooltip";
import api from "../../config/api";
import socket from "../../config/socket";

const PANEL_COLORS = {
  0: "#161b22",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
  5: "#56f06a",
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
  const [startDate, setStartDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const targetId = userId || localStorage.getItem("userId");

  const fetchContributions = useCallback(async () => {
    if (!targetId) return;
    try {
      const res = await api.get(`/user/contributions/${targetId}`);
      setActivityData(res.data.data || []);
      setSummary({
        totalContributions: res.data.totalContributions || 0,
        currentStreak: res.data.currentStreak || 0,
        repoCount: res.data.repoCount || 0,
        commitCount: res.data.commitCount || 0,
        issueCount: res.data.issueCount || 0,
      });
      if (res.data.startDate) {
        setStartDate(new Date(res.data.startDate));
      }
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

  // Real-time socket refresh: re-fetch whenever a relevant activity fires
  useEffect(() => {
    if (!targetId) return;

    const REFRESH_EVENTS = ["commit_pushed", "repo_created", "issue_created"];

    const handleActivity = (data) => {
      if (REFRESH_EVENTS.includes(data.type)) {
        // Small debounce so multiple rapid events only cause one fetch
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
              gap: "5px",
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
          marginBottom: "14px",
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
              padding: "8px 14px",
              textAlign: "center",
              minWidth: "80px",
            }}
          >
            <div
              style={{
                fontSize: "1.3rem",
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

      {/* Heatmap grid */}
      <div
        style={{
          backgroundColor: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px 20px 12px 20px",
          overflowX: "auto",
        }}
      >
        {loading ? (
          <div style={{ color: "#6e7681", fontSize: "0.9rem", padding: "20px 0" }}>
            Loading activity...
          </div>
        ) : (
          <HeatMap
            className="HeatMapProfile"
            style={{ maxWidth: "840px", color: "#8b949e" }}
            value={activityData}
            weekLabels={["", "Mon", "", "Wed", "", "Fri", ""]}
            startDate={startDate || new Date(Date.now() - 364 * 24 * 60 * 60 * 1000)}
            rectSize={13}
            space={3}
            rectProps={{ rx: 2 }}
            panelColors={PANEL_COLORS}
            rectRender={(props, data) => {
              const count = data.count || 0;
              const label =
                count === 0
                  ? `No activity on ${data.date}`
                  : `${count} contribution${count > 1 ? "s" : ""} on ${data.date}`;
              return (
                <Tooltip placement="top" content={label}>
                  <rect {...props} />
                </Tooltip>
              );
            }}
          />
        )}

        {/* Legend */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginTop: "10px",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#6e7681", marginRight: "4px" }}>Less</span>
          {Object.values(PANEL_COLORS).map((color, i) => (
            <div
              key={i}
              style={{
                width: "11px",
                height: "11px",
                backgroundColor: color,
                borderRadius: "2px",
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