import React, { useEffect, useState } from "react";
import HeatMap from "@uiw/react-heat-map";
import api from "../../config/api";

const getPanelColors = () => ({
  0: "#161b22",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
  5: "#56f06a",
});

const HeatMapProfile = ({ userId }) => {
  const [activityData, setActivityData] = useState([]);
  const [summary, setSummary] = useState({
    totalContributions: 0,
    repoCount: 0,
    totalFiles: 0,
  });
  const [startDate, setStartDate] = useState(null);

  useEffect(() => {
    const targetId = userId || localStorage.getItem("userId");
    if (!targetId) return;

    const fetchContributions = async () => {
      try {
        const res = await api.get(`/user/contributions/${targetId}`);
        setActivityData(res.data.data || []);
        setSummary({
          totalContributions: res.data.totalContributions || 0,
          repoCount: res.data.repoCount || 0,
          totalFiles: res.data.totalFiles || 0,
        });
        if (res.data.startDate) {
          setStartDate(new Date(res.data.startDate));
        }
      } catch (err) {
        console.error("Error fetching contributions:", err);
      }
    };

    fetchContributions();
  }, [userId]);

  return (
    <div style={{ textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ margin: 0, color: "#f0f6fc", fontSize: "1.05rem" }}>
          Contribution Activity (Last 120 Days)
        </h4>
        <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#8b949e" }}>
          <span>
            Total Contributions: <strong style={{ color: "#3fb950" }}>{summary.totalContributions}</strong>
          </span>
          <span>
            Active Repos: <strong style={{ color: "#58a6ff" }}>{summary.repoCount}</strong>
          </span>
          <span>
            Vault Files: <strong style={{ color: "#a371f7" }}>{summary.totalFiles}</strong>
          </span>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#0d1117",
          border: "1px solid #30363d",
          borderRadius: "8px",
          padding: "20px",
          overflowX: "auto",
        }}
      >
        <HeatMap
          className="HeatMapProfile"
          style={{ maxWidth: "800px", color: "#8b949e" }}
          value={activityData}
          weekLabels={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}
          startDate={startDate || new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)}
          rectSize={14}
          space={3}
          rectProps={{
            rx: 2.5,
          }}
          panelColors={getPanelColors()}
        />
      </div>
    </div>
  );
};

export default HeatMapProfile;
