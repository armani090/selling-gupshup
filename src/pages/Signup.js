import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createAccount = () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      alert("Please enter your name.");
      return;
    }

    if (!cleanEmail) {
      alert("Please enter your email.");
      return;
    }

    if (!password) {
      alert("Please create a password.");
      return;
    }

    if (password.length < 6) {
      alert(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    const handleResult = (data) => {
      setLoading(false);

      socket.off(
        "register_result",
        handleResult
      );

      if (!data || !data.success) {
        alert(
          data?.message ||
          "Account create nahi ho saka."
        );
        return;
      }

      alert(
        "Account successfully create ho gaya. Ab login karein."
      );

      setName("");
      setEmail("");
      setPassword("");

      navigate("/login");
    };

    socket.once(
      "register_result",
      handleResult
    );

    socket.emit(
      "register_user",
      {
        username: cleanName,
        email: cleanEmail,
        password: password
      }
    );
  };

  return (
    <div>
      <h1>Create Account</h1>

      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) =>
          setName(e.target.value)
        }
      />

      <br />
      <br />

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
        placeholder="Create Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      <br />
      <br />

      <button
        onClick={createAccount}
        disabled={loading}
      >
        {loading
          ? "Creating Account..."
          : "Create Account"}
      </button>

      <p>
        Already have an account? Login
      </p>
    </div>
  );
}

export default Signup;