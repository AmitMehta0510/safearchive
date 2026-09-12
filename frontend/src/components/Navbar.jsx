import React from "react";
import { Link } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";
import "./navbar.css";

const Navbar = () => {
  return (
    <nav>
      <Link to="/" style={{ textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <svg
            height="32"
            viewBox="0 0 16 16"
            width="32"
            fill="#ffffff"
            style={{ marginRight: "10px" }}
          >
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z"></path>
          </svg>
          <h3 style={{ margin: 0, fontWeight: 700, letterSpacing: "0.5px" }}>SafeArchive</h3>
        </div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <NotificationCenter />
        <Link to="/repo/create" style={{ textDecoration: "none" }}>
          <p style={{ margin: 0 }}>+ New Repository</p>
        </Link>
        <Link to="/profile" style={{ textDecoration: "none" }}>
          <p style={{ margin: 0 }}>Profile</p>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
