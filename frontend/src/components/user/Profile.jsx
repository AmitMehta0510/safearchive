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
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [isCustomizePinsOpen, setIsCustomizePinsOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false); // "overview" | "starred"
  const [loading, setLoading] = useState(true);
  const { setCurrentUser } = useAuth();

  const currentUserId = localStorage.getItem("userId");

  const fetchUserDetails = async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const response = await api.get(`/userProfile/${currentUserId}`);
      setUserDetails(response.data);
      setEditBio(response.data.bio || "");
      setEditCompany(response.data.company || "");
      setEditLocation(response.data.location || "");
      setEditWebsite(response.data.website || "");
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
  const followersCount = userDetails.followersCount || 0;

  
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await api.put("/updateProfile/" + currentUserId, {
        bio: editBio,
        company: editCompany,
        location: editLocation,
        website: editWebsite,
      });
      setUserDetails(res.data);
      setIsEditProfileOpen(false);
    } catch (err) {
      alert("Failed to update profile: " + (err.response?.data?.message || err.message));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleTogglePin = async (repoId) => {
    try {
      const res = await api.post("/user/pin/" + repoId);
      setUserDetails((prev) => ({
        ...prev,
        pinnedRepos: res.data.pinnedRepos,
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update pinned repository");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setCurrentUser(null);
    window.location.href = "/auth";
  };

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

          {/* Followers & Following stats */}
          <div
            className="follower"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              color: "#8b949e",
              fontSize: "0.85rem",
              flexWrap: "wrap",
            }}
          >
            <svg
              aria-hidden="true"
              height="16"
              viewBox="0 0 16 16"
              width="16"
              fill="#8b949e"
            >
              <path d="M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.234 4.002 4.002 0 0 0-7.864 0 .75.75 0 0 1-1.482-.234A5.509 5.509 0 0 1 2 5.5Zm3.5-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM12 10a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 0 2.25-2.25.75.75 0 0 1 1.5 0 3.75 3.75 0 0 1-3.75 3.75.75.75 0 0 1-.75-.75Zm-.75-5.25a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 0 2.25-2.25.75.75 0 0 1 1.5 0 3.75 3.75 0 0 1-3.75 3.75.75.75 0 0 1-.75-.75Z"></path>
            </svg>
            <span>
              <strong style={{ color: "#f0f6fc" }}>{followersCount}</strong> followers
            </span>
            <span>·</span>
            <span>
              <strong style={{ color: "#f0f6fc" }}>{followingCount}</strong> following
            </span>
          </div>

          {/* Repositories count */}
          <div style={{ marginTop: "8px", color: "#8b949e", fontSize: "0.85rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" fill="#8b949e">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z"></path>
              </svg>
              <strong style={{ color: "#f0f6fc" }}>{repoList.length}</strong> repositories
            </span>
          </div>

          {/* Bio & Details */}
          {userDetails.bio && (
            <div style={{ marginTop: "14px", fontSize: "0.9rem", color: "#c9d1d9", lineHeight: "1.4" }}>
              {userDetails.bio}
            </div>
          )}

          <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.84rem", color: "#8b949e" }}>
            {userDetails.company && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🏢</span>
                <span style={{ color: "#c9d1d9" }}>{userDetails.company}</span>
              </div>
            )}
            {userDetails.location && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📍</span>
                <span style={{ color: "#c9d1d9" }}>{userDetails.location}</span>
              </div>
            )}
            {userDetails.website && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔗</span>
                <a href={userDetails.website.startsWith("http") ? userDetails.website : ("https://" + userDetails.website)} target="_blank" rel="noreferrer" style={{ color: "#58a6ff", textDecoration: "none" }}>
                  {userDetails.website}
                </a>
              </div>
            )}
          </div>

          {/* Edit Profile Button */}
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="btn-secondary"
            style={{ width: "100%", marginTop: "16px", justifyContent: "center" }}
          >
            Edit Profile
          </button>

          {/* Sign Out Button in Sidebar */}
          <button
            onClick={handleSignOut}
            style={{
              width: "100%",
              marginTop: "24px",
              backgroundColor: "#21262d",
              color: "#f85149",
              border: "1px solid #30363d",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            id="logout"
          >
            Sign Out
          </button>
        </aside>

        {/* Right Main Content */}
        <main className="profile-main-content">
          {activeTab === "overview" && (
            <div>
              {/* Pinned Repositories Section */}
              <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h4 style={{ margin: 0, color: "#f0f6fc", fontSize: "1rem" }}>
                    Pinned Repositories
                  </h4>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: "0.8rem", padding: "3px 10px" }}
                    onClick={() => setIsCustomizePinsOpen(true)}
                  >
                    Customize your pins
                  </button>
                </div>

                {(!userDetails.pinnedRepos || userDetails.pinnedRepos.length === 0) ? (
                  <div style={{ padding: "16px", border: "1px dashed #30363d", borderRadius: "6px", color: "#8b949e", fontSize: "0.88rem", textAlign: "center" }}>
                    No pinned repositories yet. Click "Customize your pins" to showcase up to 6 vaults!
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                    {userDetails.pinnedRepos.map((pin) => {
                      const pId = pin._id || pin;
                      const pName = pin.name || "Repository";
                      return (
                        <div
                          key={pId}
                          style={{
                            backgroundColor: "#161b22",
                            border: "1px solid #30363d",
                            borderRadius: "6px",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <Link to={"/repo/" + pId} style={{ color: "#58a6ff", fontWeight: 600, textDecoration: "none", fontSize: "0.95rem" }}>
                                📌 {pName}
                              </Link>
                              <span className="badge-visibility">{pin.visibility || "public"}</span>
                            </div>
                            <p style={{ margin: 0, color: "#8b949e", fontSize: "0.85rem", lineHeight: "1.4" }}>
                              {pin.description || "SafeArchive cloud vault"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* HeatMap Section */}
              <div className="heat-map-section" style={{ marginBottom: "24px" }}>
                <HeatMapProfile userId={currentUserId} />
              </div>

              {/* Repositories Quick Grid */}
              <h4 style={{ color: "#f0f6fc", marginBottom: "12px", fontSize: "1rem" }}>
                Your SafeArchive Vaults
              </h4>
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
                          padding: "16px",
                          color: "#c9d1d9",
                          display: "block",
                          transition: "border-color 0.2s ease",
                        }}
                      >
                        <h4 style={{ margin: "0 0 6px 0", color: "#58a6ff", fontSize: "1rem" }}>{rName}</h4>
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
              <h4 style={{ color: "#f0f6fc", marginBottom: "16px", fontSize: "1rem" }}>
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
