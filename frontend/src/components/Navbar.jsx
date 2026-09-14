import React from "react";
import { NavLink, Link } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";
import "./navbar.css";

const Navbar = () => {
  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="SafeArchive Home">
          <img
            src="/logo.png"
            alt="SafeArchive logo"
            style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover" }}
          />
          <span>SafeArchive</span>
        </Link>

        {/* Right-side actions */}
        <nav className="navbar-actions" aria-label="Main navigation">
          <NotificationCenter />

          <div className="navbar-divider" aria-hidden="true" />

          <Link to="/repo/create" className="navbar-cta" id="navbar-new-repo">
            <span aria-hidden="true">+</span>
            <span>New</span>
          </Link>

          <NavLink
            to="/profile"
            id="navbar-profile-link"
            className={({ isActive }) =>
              isActive ? "navbar-link active" : "navbar-link"
            }
          >
            Profile
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;

