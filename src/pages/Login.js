import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      alert("Email aur password dono enter karein.");
      return;
    }

    setLoading(true);

    const handleResult = (data) => {
      setLoading(false);

      socket.off("login_result", handleResult);

      if (!data || !data.success) {
        alert(
          data?.message ||
          "Email ya password ghalat hai."
        );
        return;
      }

      const user = data.user;

      if (!user || !user.username) {
        alert("Login data incomplete hai.");
        return;
      }

      // Purana user data remove karo
      localStorage.removeItem("username");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      // Naye user ka data save karo
      localStorage.setItem(
        "username",
        user.username
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      // User ka role save karo
      localStorage.setItem(
        "role",
        user.role || "user"
      );

      // Login status
      localStorage.setItem(
        "login",
        "true"
      );

      console.log(
        "LOGIN SUCCESS:",
        user.username
      );

      console.log(
        "USER ROLE:",
        user.role || "user"
      );

      navigate("/");
      window.location.reload();
    };

    socket.once(
      "login_result",
      handleResult
    );

    socket.emit(
      "login_user",
      {
        email: cleanEmail,
        password: password
      }
    );
  };

  return (
    <div>
      <h1>Login</h1>

      <input
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
      />

      <br />
      <br />

      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <br />
      <br />

      <button
        type="button"
        onClick={() =>
          navigate("/forgot-password")
        }
        style={{
          marginTop: "12px",
          background: "none",
          border: "none",
          color: "#0066cc",
          cursor: "pointer",
          textDecoration: "underline"
        }}
      >
        Forgot Password?
      </button>

      <button
        onClick={handleLogin}
        disabled={loading}
      >
        {loading
          ? "Logging in..."
          : "Login"}
      </button>
    </div>
  );
}

export default Login;