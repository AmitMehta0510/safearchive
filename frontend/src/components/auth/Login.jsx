import React, { useState } from "react";
import api from "../../config/api";
import { useAuth } from "../../authContext";
import { Link } from "react-router-dom";
import "./auth.css";
import usePageMeta from "../../hooks/usePageMeta";


const Login = () => {
  usePageMeta("Sign in", "Sign in to your SafeArchive account to access your repositories.");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setCurrentUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const res = await api.post("/login", {
        email: email.trim(),
        password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      setCurrentUser(res.data.userId);
      window.location.href = "/";
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please check your credentials.";
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
        <h1>Sign in to SafeArchive</h1>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <form onSubmit={handleLogin} noValidate>
          <div className="auth-field">
            <label className="auth-label" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
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
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="auth-footer-card">
        New to SafeArchive?{" "}
        <Link to="/signup">Create an account</Link>
      </div>
    </div>
  );
};

export default Login;

