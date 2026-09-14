
import { useState } from "react";
import { io } from "socket.io-client";

function Profile() {
  const socket = io("http://localhost:5000");
  const savedUser = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const [username, setUsername] = useState(
    savedUser.username ||
      localStorage.getItem("username") ||
      "Guest"
  );

  const [email] = useState(
    savedUser.email ||
      localStorage.getItem("email") ||
      "No Email"
  );

  const [bio, setBio] = useState(
    localStorage.getItem("bio") ||
      "Welcome to Selling GupShup"
  );

  const [image, setImage] = useState(
    localStorage.getItem("profileImage") || ""
  );

  const [videoStatus, setVideoStatus] = useState(
    localStorage.getItem("videoStatus") || ""
  );

  const saveProfile = () => {
    localStorage.setItem("username", username);
    localStorage.setItem("email", email);
    localStorage.setItem("bio", bio);
    localStorage.setItem("profileImage", image);
    localStorage.removeItem("videoStatus");

    const currentUser = JSON.parse(
      localStorage.getItem("user") || "{}"
    );

    localStorage.setItem(
      "user",
      JSON.stringify({
        ...currentUser,
        username: username,
        email: email,
        bio: bio,
        profileImage: image,
        videoStatus: videoStatus
      })
    );

    socket.emit("update_user_profile", {
      username: username,
      bio: bio,
      profileImage: image,
      videoStatus: videoStatus
    });

    alert("Profile Updated Successfully 👍");
  };
  const uploadImage = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        setImage(reader.result);
      };

      reader.readAsDataURL(file);
    }
  };

  const uploadVideoStatus = async (e) => {
    const file = e.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("video/")) {
      alert("Please sirf video file select karein.");
      return;
    }

    const maxSize = 15 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(
        "Video bohat bari hai. Please 15 MB ya us se choti video select karein."
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await fetch(
        "http://localhost:5000/upload-video-status",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Video upload nahi hui."
        );
      }

      const videoUrl =
        "http://localhost:5000" + data.videoUrl;

      setVideoStatus(videoUrl);


      alert("Video Status upload ho gaya 👍");
    } catch (error) {
      console.error("Video upload error:", error);
      alert("Video upload nahi hui. Server check karein.");
    }
  };
  const removeVideoStatus = () => {
    setVideoStatus("");
    localStorage.removeItem("videoStatus");

    alert("Video Status removed.");
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 70px)",
        background:
          "linear-gradient(135deg, #f5f7fa 0%, #e8edf3 100%)",
        padding: "40px 20px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "22px",
          boxShadow: "0 10px 35px rgba(0,0,0,0.12)",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #667eea, #764ba2)",
            height: "70px",
            position: "relative"
          }}
        />

        <div
          style={{
            padding: "0 30px 30px",
            textAlign: "center"
          }}
        >
          <div
            style={{
              marginTop: "-65px",
              marginBottom: "15px",
              position: "relative"
            }}
          >
            {image ? (
              <img
                src={image}
                alt="Profile"
                style={{
                  width: "130px",
                  height: "130px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "6px solid #ffffff",
                  boxShadow:
                    "0 5px 18px rgba(0,0,0,0.18)"
                }}
              />
            ) : (
              <div
                style={{
                  width: "130px",
                  height: "130px",
                  borderRadius: "50%",
                  border: "6px solid #ffffff",
                  background: "#f0f2f5",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "55px",
                  boxShadow:
                    "0 5px 18px rgba(0,0,0,0.18)"
                }}
              >
                👤
              </div>
            )}
          </div>

          <h1
            style={{
              margin: "5px 0 5px",
              fontSize: "28px",
              color: "#222",
              fontWeight: "700"
            }}
          >
            {username}
          </h1>

          <p
            style={{
              margin: "0 auto 20px",
              color: "#666",
              fontSize: "15px",
              maxWidth: "400px",
              lineHeight: "1.5"
            }}
          >
            {bio}
          </p>

          {videoStatus && (
            <div
              style={{
                marginBottom: "20px",
                textAlign: "left",
                background: "#f8f9fb",
                borderRadius: "14px",
                padding: "12px"
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#555",
                  marginBottom: "10px"
                }}
              >
                🎥 Video Status
              </div>

              <video
                src={videoStatus}
                controls
                playsInline
                style={{
                  width: "100%",
                  maxHeight: "280px",
                  borderRadius: "12px",
                  display: "block",
                  background: "#000"
                }}
              />

              <button
                onClick={removeVideoStatus}
                style={{
                  width: "100%",
                  marginTop: "10px",
                  padding: "9px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#f1f1f1",
                  color: "#d33",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                🗑️ Remove Video Status
              </button>
            </div>
          )}

          <div
            style={{
              textAlign: "left",
              background: "#f8f9fb",
              borderRadius: "14px",
              padding: "11px",
              marginBottom: "20px"
            }}
          >
            <div
              style={{
                fontSize: "13px",
                color: "#888",
                marginBottom: "5px"
              }}
            >
              EMAIL ADDRESS
            </div>

            <div
              style={{
                fontSize: "16px",
                color: "#333",
                fontWeight: "500"
              }}
            >
              📧 {email}
            </div>
          </div>

          <div
            style={{
              textAlign: "left",
              borderTop: "1px solid #eee",
              paddingTop: "20px"
            }}
          >
            <h3
              style={{
                marginTop: "0",
                marginBottom: "15px",
                color: "#333"
              }}
            >
              ✏️ Edit Profile
            </h3>

            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#555"
              }}
            >
              Profile Picture
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={uploadImage}
              style={{
                width: "100%",
                marginBottom: "18px"
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#555"
              }}
            >
              🎥 Video Status
            </label>

            <input
              type="file"
              accept="video/*"
              onChange={uploadVideoStatus}
              style={{
                width: "100%",
                marginBottom: "8px"
              }}
            />

            <div
              style={{
                fontSize: "12px",
                color: "#888",
                marginBottom: "18px"
              }}
            >
              Maximum video size: 15 MB
            </div>

            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#555"
              }}
            >
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid #ddd",
                borderRadius: "9px",
                boxSizing: "border-box",
                marginBottom: "15px",
                fontSize: "15px"
              }}
            />

            <label
              style={{
                display: "block",
                marginBottom: "7px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#555"
              }}
            >
              Bio
            </label>

            <textarea
              value={bio}
              onChange={(e) =>
                setBio(e.target.value)
              }
              rows="3"
              style={{
                width: "100%",
                padding: "11px 12px",
                border: "1px solid #ddd",
                borderRadius: "9px",
                boxSizing: "border-box",
                resize: "vertical",
                marginBottom: "18px",
                fontSize: "15px",
                fontFamily: "inherit"
              }}
            />

            <button
              onClick={saveProfile}
              style={{
                width: "100%",
                padding: "13px",
                border: "none",
                borderRadius: "10px",
                background:
                  "linear-gradient(135deg, #667eea, #764ba2)",
                color: "#ffffff",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow:
                  "0 4px 12px rgba(102,126,234,0.3)"
              }}
            >
              Save Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
