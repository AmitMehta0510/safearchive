import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../config/api";
import Navbar from "./Navbar";

const CreateRepository = () => {
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!repoName.trim()) {
      setError("Repository name is required.");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      setError("Please log in to create a repository.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/repo/create", {
        name: repoName.trim(),
        description: description.trim(),
        visibility: visibility,
        owner: userId,
      });

      setSuccess(`Repository '${response.data.name}' created successfully in SafeArchive!`);
      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Failed to create repository.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div style={styles.wrapper}>
        <div style={styles.container}>
          <h1 style={styles.header}>Create New SafeArchive Repository</h1>
          <p style={styles.subtext}>A repository contains all project files, revision history, and issue logs.</p>

          {error && <div style={styles.errorBox}>{error}</div>}
          {success && <div style={styles.successBox}>{success}</div>}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label htmlFor="repoName" style={styles.label}>
                Repository Name <span style={{ color: "#f85149" }}>*</span>
              </label>
              <input
                type="text"
                id="repoName"
                value={repoName}
                placeholder="e.g., cloud-vault-engine"
                onChange={(e) => setRepoName(e.target.value)}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label htmlFor="description" style={styles.label}>
                Description <span style={{ color: "#8b949e", fontWeight: "normal" }}>(optional)</span>
              </label>
              <input
                type="text"
                id="description"
                placeholder="Brief description of the repository"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Visibility</label>
              <div style={styles.radioGroup}>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                    style={styles.radio}
                  />
                  Public (Anyone on SafeArchive can view)
                </label>
                <label style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                    style={styles.radio}
                  />
                  Private (Only authorized members can view)
                </label>
              </div>
            </div>

            <button type="submit" disabled={loading} style={styles.submitButton}>
              {loading ? "Creating..." : "Create Repository"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

const styles = {
  wrapper: {
    padding: "40px 20px",
    display: "flex",
    justifyContent: "center",
  },
  container: {
    display: "flex",
    flexDirection: "column",
    padding: "32px",
    maxWidth: "640px",
    width: "100%",
    backgroundColor: "#161b22",
    borderRadius: "8px",
    border: "1px solid #30363d",
    color: "#c9d1d9",
  },
  header: {
    fontSize: "1.6rem",
    marginBottom: "8px",
    color: "#f0f6fc",
  },
  subtext: {
    fontSize: "0.9rem",
    color: "#8b949e",
    marginBottom: "24px",
  },
  errorBox: {
    backgroundColor: "rgba(248, 81, 73, 0.15)",
    border: "1px solid #f85149",
    color: "#ff7b72",
    padding: "10px 14px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  successBox: {
    backgroundColor: "rgba(46, 160, 67, 0.15)",
    border: "1px solid #2ea043",
    color: "#3fb950",
    padding: "10px 14px",
    borderRadius: "6px",
    marginBottom: "16px",
    fontSize: "0.9rem",
  },
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
  },
  inputGroup: {
    marginBottom: "20px",
    width: "100%",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#f0f6fc",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    borderRadius: "6px",
    border: "1px solid #30363d",
    backgroundColor: "#0d1117",
    color: "#c9d1d9",
    boxSizing: "border-box",
    outline: "none",
  },
  radioGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  radioLabel: {
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#c9d1d9",
    cursor: "pointer",
  },
  radio: {
    accentColor: "#238636",
  },
  submitButton: {
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: "600",
    backgroundColor: "#238636",
    color: "#ffffff",
    border: "1px solid rgba(240, 246, 252, 0.1)",
    borderRadius: "6px",
    cursor: "pointer",
    marginTop: "12px",
  },
};

export default CreateRepository;
