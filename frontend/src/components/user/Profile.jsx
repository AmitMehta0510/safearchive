import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../config/api";
import "./profile.css";
import Navbar from "../Navbar";
import { UnderlineNav } from "@primer/react";
import { BookIcon, RepoIcon, StarIcon } from "@primer/octicons-react";
import HeatMapProfile from "./HeatMap";
import { useAuth } from "../../authContext";

const Profile = () => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "starred"
  const [loading, setLoading] = useState(true);
  const { setCurrentUser } = useAuth();

  const currentUserId = localStorage.getItem("userId");

  const fetchUserDetails = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const response = await api.get(`/userProfile/${currentUserId}`);
      setUserDetails(response.data);
    } catch (err) {
      console.error("Cannot fetch user details: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [currentUserId]);

  if (loading || !userDetails) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: "center", padding: "60px", color: "#8b949e" }}>
          Loading profile...
        </div>
      </>
    );
  }

  const starredList = userDetails.starRepos || [];
  const repoList = userDetails.repositories || [];
  const followingCount = (userDetails.followedUsers || []).length;

  return (
    <>
      <Navbar />
      <UnderlineNav aria-label="Profile Tabs" sx={{ borderBottomColor: "#30363d", padding: "0 24px" }}>
        <UnderlineNav.Item
          aria-current={activeTab === "overview" ? "page" : undefined}
          icon={BookIcon}
          onClick={() => setActiveTab("overview")}
          sx={{
            cursor: "pointer",
            backgroundColor: "transparent",
            color: activeTab === "overview" ? "white" : "#8b949e",
            fontWeight: activeTab === "overview" ? "600" : "400",
          }}
        >
          Overview ({repoList.length})
        </UnderlineNav.Item>

        <UnderlineNav.Item
          aria-current={activeTab === "starred" ? "page" : undefined}
          icon={StarIcon}
          onClick={() => setActiveTab("starred")}
          sx={{
            cursor: "pointer",
            backgroundColor: "transparent",
            color: activeTab === "starred" ? "white" : "#8b949e",
            fontWeight: activeTab === "starred" ? "600" : "400",
          }}
        >
          Starred Repositories ({starredList.length})
        </UnderlineNav.Item>
      </UnderlineNav>

      <button
        onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("userId");
          setCurrentUser(null);
          window.location.href = "/auth";
        }}
        style={{
          position: "fixed",
          bottom: "40px",
          right: "40px",
          backgroundColor: "#21262d",
          color: "#f85149",
          border: "1px solid #30363d",
          padding: "8px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          zIndex: 100,
        }}
        id="logout"
      >
        Sign Out
      </button>

      <div className="profile-page-wrapper">
        {/* Left Profile Sidebar */}
        <aside className="user-profile-section">
          <div
            className="profile-image"
            style={{
              backgroundColor: "#238636",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "2.5rem",
              fontWeight: "bold",
              textTransform: "uppercase",
            }}
          >
            {userDetails.username ? userDetails.username[0] : "U"}
          </div>

          <div className="name" style={{ marginTop: "12px" }}>
            <h3 style={{ margin: 0, color: "#f0f6fc", fontSize: "1.4rem" }}>
              {userDetails.username}
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#8b949e", fontSize: "0.9rem" }}>
              {userDetails.email}
            </p>
          </div>

          <div
            className="follower"
            style={{ display: "flex", gap: "16px", marginTop: "16px", color: "#8b949e", fontSize: "0.85rem" }}
          >
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#f0f6fc" }}>{repoList.length}</strong> Repositories
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: "#f0f6fc" }}>{followingCount}</strong> Following
            </p>
          </div>
        </aside>

        {/* Right Main Content */}
        <main style={{ flex: 1, textAlign: "left" }}>
          {activeTab === "overview" && (
            <div>
              {/* HeatMap Section */}
              <div className="heat-map-section" style={{ marginBottom: "24px" }}>
                <HeatMapProfile userId={currentUserId} />
              </div>

              {/* Repositories Quick Grid */}
              <h4 style={{ color: "#f0f6fc", marginBottom: "12px" }}>Your SafeArchive Vaults</h4>
              {repoList.length === 0 ? (
                <p style={{ color: "#8b949e" }}>No repositories created yet.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                  {repoList.map((r) => {
                    const rId = r._id || r;
                    const rName = r.name || "Repository";
                    return (
                      <Link
                        key={rId}
                        to={`/repo/${rId}`}
                        style={{
                          textDecoration: "none",
                          backgroundColor: "#161b22",
                          border: "1px solid #30363d",
                          borderRadius: "6px",
                          padding: "14px",
                          color: "#c9d1d9",
                        }}
                      >
                        <h4 style={{ margin: "0 0 6px 0", color: "#58a6ff" }}>{rName}</h4>
                        <p style={{ margin: 0, color: "#8b949e", fontSize: "0.85rem" }}>
                          {r.description || "SafeArchive cloud vault"}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "starred" && (
            <div>
              <h4 style={{ color: "#f0f6fc", marginBottom: "16px" }}>
                Starred Repositories ({starredList.length})
              </h4>
              {starredList.length === 0 ? (
                <p style={{ color: "#8b949e" }}>You haven't starred any repositories yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {starredList.map((repo) => (
                    <Link
                      key={repo._id}
                      to={`/repo/${repo._id}`}
                      style={{
                        textDecoration: "none",
                        backgroundColor: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "6px",
                        padding: "16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <h4 style={{ margin: "0 0 4px 0", color: "#58a6ff" }}>{repo.name}</h4>
                        <p style={{ margin: 0, color: "#8b949e", fontSize: "0.85rem" }}>
                          {repo.description || "No description provided."}
                        </p>
                      </div>
                      <span style={{ color: "#e3b341", fontSize: "0.9rem" }}>★ Starred</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Profile;
