import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const LINKS = [
  { to: "/", label: "Home", icon: "🏠", end: true },
  { to: "/meals", label: "Previous Meals", icon: "🍽️" },
  { to: "/goals", label: "Daily Goals", icon: "🎯" },
];

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="logo">🍽️</span>
          <span className="brand-name">CalorieSnap</span>
        </NavLink>

        <nav className="nav-links">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <span className="nav-icon" aria-hidden="true">
                {link.icon}
              </span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="nav-auth">
          {isLoggedIn ? (
            <>
              <span className="user-greeting" title={user.email}>
                Hi, {user.name.split(" ")[0]} 👋
              </span>
              <button className="btn btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => navigate("/login")}>
              Log in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
