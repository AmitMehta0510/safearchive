import React, { useState } from "react";
import api from "../../config/api";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import "./auth.css";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setCurrentUser } = useAuth();

  const USERNAME_REGEX = /^[a-zA-Z0-9._-]+$/;

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill out all fields.");
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 30) {
      setError("Username must be 3–30 characters.");
      return;
    }
    if (!USERNAME_REGEX.test(username.trim())) {
      setError("Username can only contain letters, numbers, dots (.), hyphens (-), and underscores (_).");
      return;
    }
    try {
      setLoading(true);
      const res = await api.post("/signup", {
        email: email.trim(),
        password,
        username: username.trim(),
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      setCurrentUser(res.data.userId);
      window.location.href = "/";
    } catch (err) {
      const data = err.response?.data;
      // express-validator returns { error, details: [{field, message}] }
      // controller errors return { message }
      const msg =
        data?.details?.[0]?.message ||
        data?.message ||
        "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Brand */}
      <div className="auth-logo-area">
        <img src="/logo.png" alt="SafeArchive logo" style={{ width: "48px", height: "48px", borderRadius: "10px", objectFit: "cover" }} />
        <span className="auth-brand-name">SafeArchive</span>
        <p className="auth-tagline">Secure cloud-backed version control</p>
      </div>

      {/* Card */}
      <div className="auth-card">
        <h1>Create your account</h1>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleSignup} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-username">
              Username
            </label>
            <input
              id="signup-username"
              name="username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <p style={{ fontSize: "0.75rem", color: "#8b949e", margin: "4px 0 0" }}>
              3–30 characters. Letters, numbers, <code style={{ background: "#161b22", padding: "1px 4px", borderRadius: "3px" }}>.</code>{" "}
              <code style={{ background: "#161b22", padding: "1px 4px", borderRadius: "3px" }}>_</code>{" "}
              <code style={{ background: "#161b22", padding: "1px 4px", borderRadius: "3px" }}>-</code> allowed.
            </p>
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-email">
              Email address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label className="auth-label" htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="auth-footer-card">
        Already have an account?{" "}
        <Link to="/auth">Sign in</Link>
      </div>
    </div>
  );
};

export default Signup;
