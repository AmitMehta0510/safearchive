import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./dashboard.css";
import Navbar from "../Navbar";
import api from "../../config/api";
import socket from "../../config/socket";
import { SkeletonCard } from "../Skeleton";
import usePageMeta from "../../hooks/usePageMeta";

const Dashboard = () => {
  usePageMeta("Dashboard", "Your SafeArchive repositories, live activity, and suggested vaults.");
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedRepositories, setSuggestedRepositories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveActivities, setLiveActivities] = useState([
    {
      type: "system",
      text: "SafeArchive Vault Server Online",
      time: "Just now",
    },
  ]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");

    const fetchData = async () => {
      setLoading(true);
      try {
        if (userId) {
          const userRepoRes = await api.get(`/repo/user/${userId}`);
          setRepositories(userRepoRes.data.repositories || []);
        }

        const suggestedRes = await api.get(`/repo/all`);
        setSuggestedRepositories(suggestedRes.data?.repositories || suggestedRes.data || []);
      } catch (err) {
        console.error("Error while fetching repositories: ", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for live socket events
    const handleActivity = (data) => {
      let message = "";
      if (data.type === "repo_created") {
        message = `New repository created: ${data.repoName}`;
      } else if (data.type === "issue_created") {
        message = `New issue opened: "${data.title}"`;
      } else if (data.type === "issue_updated") {
        message = `Issue status changed: "${data.title}" (${data.status})`;
      } else if (data.type === "repo_starred") {
        message = `${data.user || "A developer"} starred ${data.repoName}`;
      } else if (data.type === "user_followed") {
        message = `${data.user} started following ${data.targetUser}`;
      } else {
        message = data.text || "SafeArchive cloud event recorded";
      }

      setLiveActivities((prev) => [
        {
          id: Date.now(),
          text: message,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev.slice(0, 5),
      ]);
    };

    socket.on("activity", handleActivity);

    return () => {
      socket.off("activity", handleActivity);
    };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(repositories);
    } else {
      const filteredRepo = repositories.filter((repo) =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filteredRepo);
    }
  }, [searchQuery, repositories]);

  return (
    <>
      <Navbar />
      <section id="dashboard">
        {/* Suggested Repositories Sidebar */}
        <aside>
          <h3>Suggested Repositories</h3>
          {suggestedRepositories.length === 0 ? (
            <p style={{ color: "#8b949e", fontSize: "0.9rem" }}>No repositories yet.</p>
          ) : (
            suggestedRepositories.map((repo) => (
              <Link
                key={repo._id}
                to={`/repo/${repo._id}`}
                className="repo-card"
              >
                <div className="repo-card-header">
                  <h4 className="repo-card-title">{repo.name}</h4>
                  <span className="badge-public">{repo.visibility || "public"}</span>
                </div>
                <p className="repo-card-desc">
                  {repo.description || "No description provided."}
                </p>
              </Link>
            ))
          )}
        </aside>

        {/* Main Feed: User's Repositories */}
        <main>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>Your Repositories</h2>
            <Link
              to="/repo/create"
              style={{
                backgroundColor: "#238636",
                color: "#ffffff",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              + New
            </Link>
          </div>

          <div id="search">
            <input
              type="text"
              value={searchQuery}
              placeholder="Search your repositories..."
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#8b949e" }}>
              <p>{searchQuery ? "No matching repositories found." : "You have not created any repositories yet."}</p>
              <Link
                to="/repo/create"
                style={{ color: "#58a6ff", fontSize: "0.9rem" }}
              >
                Create your first SafeArchive repository
              </Link>
            </div>
          ) : (
            searchResults.map((repo) => (
              <Link
                key={repo._id}
                to={`/repo/${repo._id}`}
                className="repo-card"
              >
                <div className="repo-card-header">
                  <h4 className="repo-card-title">{repo.name}</h4>
                  <span className="badge-public">{repo.visibility || "public"}</span>
                </div>
                <p className="repo-card-desc">
                  {repo.description || "No description provided."}
                </p>
              </Link>
            ))
          )}
        </main>

        {/* SafeArchive Live Activity & Insights */}
        <aside>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h3 style={{ margin: 0, borderBottom: "none", paddingBottom: 0 }}>Live Activity</h3>
            <span style={{ fontSize: "0.75rem", color: "#3fb950", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ height: "7px", width: "7px", borderRadius: "50%", backgroundColor: "#3fb950" }}></span>
              Connected
            </span>
          </div>

          <div style={{ borderBottom: "1px solid #30363d", paddingBottom: "12px", marginBottom: "16px" }}>
            {liveActivities.map((act, index) => (
              <div
                key={act.id || index}
                style={{
                  backgroundColor: "#0d1117",
                  border: "1px solid #21262d",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  marginBottom: "8px",
                  fontSize: "0.85rem",
                  color: "#c9d1d9",
                }}
              >
                <p style={{ margin: "0 0 4px 0", lineHeight: 1.3 }}>{act.text}</p>
                <span style={{ fontSize: "0.75rem", color: "#8b949e" }}>{act.time}</span>
              </div>
            ))}
          </div>

          <h4 style={{ color: "#f0f6fc", margin: "0 0 10px 0", fontSize: "0.95rem" }}>Platform Insights</h4>
          <ul style={{ paddingLeft: "16px", color: "#c9d1d9", fontSize: "0.85rem", margin: 0 }}>
            <li style={{ marginBottom: "8px" }}>
              <strong style={{ color: "#3fb950" }}>Cloud Vault S3</strong>
              <p style={{ margin: "2px 0 0 0", color: "#8b949e", fontSize: "0.75rem" }}>
                Immutable commit archives enabled.
              </p>
            </li>
            <li style={{ marginBottom: "8px" }}>
              <strong style={{ color: "#58a6ff" }}>Real-Time WebSockets</strong>
              <p style={{ margin: "2px 0 0 0", color: "#8b949e", fontSize: "0.75rem" }}>
                Bi-directional live activity stream.
              </p>
            </li>
            <li>
              <strong style={{ color: "#a371f7" }}>Dynamic Heatmap</strong>
              <p style={{ margin: "2px 0 0 0", color: "#8b949e", fontSize: "0.75rem" }}>
                Tracks commits & repository metrics.
              </p>
            </li>
          </ul>
        </aside>
      </section>
    </>
  );
};

export default Dashboard;
