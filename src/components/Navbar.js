import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role") || "user";
  const navigate = useNavigate();

  const isMainAdmin =
    username &&
    username.toLowerCase() === "armani";

  const hasAdminPanelAccess =
    isMainAdmin ||
    role === "admin" ||
    role === "moderator";

  const logout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("login");
    localStorage.removeItem("role");
    localStorage.removeItem("user");

    alert("Logout Successfully 👍");

    navigate("/login");
  };

  return (
    <nav className="navbar">
      <h2>🌐 Selling GupShup</h2>

      <div className="nav-links">
        <Link to="/">
          Home
        </Link>

        <Link to="/chat">
          Chat
        </Link>

        {username ? (
          <>
            <span>
              👤 {username}
            </span>

            <Link to="/profile">
              Profile
            </Link>

            {hasAdminPanelAccess && (
              <Link to="/admin">
                🛡️ Admin Panel
              </Link>
            )}

            <button onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">
              Login
            </Link>

            <Link to="/signup">
              Signup
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;