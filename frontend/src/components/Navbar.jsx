import React from "react";
import { NavLink, Link } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";
import "./navbar.css";

const SafeArchiveLogo = () => (
  <svg className="navbar-logo-icon" viewBox="0 0 16 16" aria-hidden="true">
    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z" />
  </svg>
);

const Navbar = () => {
  return (
    <header className="navbar" role="banner">
      <div className="navbar-inner">
        {/* Brand */}
        <Link to="/" className="navbar-brand" aria-label="SafeArchive Home">
          <SafeArchiveLogo />
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

