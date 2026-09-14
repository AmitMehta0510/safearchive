import React, { useState } from "react";
import api from "../../config/api";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import "./auth.css";

const SafeArchiveLogo = () => (
  <svg className="auth-logo-svg" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z" />
  </svg>
);

const Signup = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setCurrentUser } = useAuth();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !email.trim() || !password) {
      setError("Please fill out all fields.");
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
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Brand */}
      <div className="auth-logo-area">
        <SafeArchiveLogo />
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
