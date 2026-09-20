import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = () => {
    const enteredEmail = email.trim().toLowerCase();

    if (!enteredEmail) {
      setMessage("Please enter your email address.");
      return;
    }

    setMessage("");
    setLoading(true);

    socket.emit("request_password_reset", {
      email: enteredEmail
    });
  };

  const verifyOtp = () => {
    const enteredOtp = otp.trim();

    if (!enteredOtp || enteredOtp.length !== 6) {
      setMessage("Please enter the 6-digit OTP.");
      return;
    }

    setMessage("");
    setLoading(true);

    socket.emit("verify_password_reset", {
      email: email.trim().toLowerCase(),
      otp: enteredOtp
    });
  };

  const resetPassword = () => {
    if (!newPassword) {
      setMessage("Please enter a new password.");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    setMessage("");
    setLoading(true);

    socket.emit("reset_password", {
      email: email.trim().toLowerCase(),
      resetToken,
      newPassword
    });
  };

  const handleOtpResult = (data) => {
    setLoading(false);
    setMessage(data.message || "");

    if (data.success) {
      setStep(2);
    }
  };

  const handleVerifyResult = (data) => {
    setLoading(false);
    setMessage(data.message || "");

    if (data.success && data.resetToken) {
      setResetToken(data.resetToken);
      setStep(3);
    }
  };

  const handleFinalResult = (data) => {
    setLoading(false);
    setMessage(data.message || "");

    if (data.success) {
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }
  };

  useEffect(() => {
    socket.on("password_reset_result", handleOtpResult);
    socket.on(
      "password_reset_verify_result",
      handleVerifyResult
    );
    socket.on(
      "password_reset_final_result",
      handleFinalResult
    );

    return () => {
      socket.off(
        "password_reset_result",
        handleOtpResult
      );
      socket.off(
        "password_reset_verify_result",
        handleVerifyResult
      );
      socket.off(
        "password_reset_final_result",
        handleFinalResult
      );
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ maxWidth: "420px", margin: "40px auto", padding: "20px" }}>
      <h1>Forgot Password</h1>

      {step === 1 && (
        <>
          <p>
            Enter the email address linked to your
            Selling GupShup account.
          </p>

          <input
            type="email"
            placeholder="Enter Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box"
            }}
          />

          <br />
          <br />

          <button
            onClick={sendOtp}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p>
            OTP aap ke Gmail par bhej diya gaya hai.
          </p>

          <p>
            Apna 6-digit OTP enter karein.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength="6"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, ""))
            }
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box"
            }}
          />

          <br />
          <br />

          <button
            onClick={verifyOtp}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <p>
            OTP successfully verify ho gaya.
          </p>

          <p>
            Ab apna naya password enter karein.
          </p>

          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) =>
              setNewPassword(e.target.value)
            }
            style={{
              width: "100%",
              padding: "10px",
              boxSizing: "border-box"
            }}
          />

          <br />
          <br />

          <button
            onClick={resetPassword}
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </>
      )}

      {message && (
        <p style={{ marginTop: "20px" }}>
          {message}
        </p>
      )}

      <br />

      <button onClick={() => navigate("/login")}>
        Back to Login
      </button>
    </div>
  );
}

export default ForgotPassword;

