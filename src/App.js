import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/ForgotPassword";
import Admin from "./pages/Admin";
import MyPromotions from "./pages/MyPromotions";

import { socket } from "./socket";

function App() {
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("unreadCounts")) || {};
    } catch {
      return {};
    }
  });

  const [notification, setNotification] = useState("");

  useEffect(() => {
    localStorage.setItem(
      "unreadCounts",
      JSON.stringify(unreadCounts)
    );
  }, [unreadCounts]);

  useEffect(() => {
    const handleConnect = () => {
      console.log(
        "App Socket connected:",
        socket.id
      );

      const savedUsername =
        localStorage.getItem("username") || "";

      const loggedIn =
        localStorage.getItem("login") === "true";

      if (
        loggedIn &&
        savedUsername &&
        savedUsername !== "Guest" &&
        savedUsername !== "Guest User"
      ) {
        socket.emit(
          "join_chat",
          savedUsername
        );

        console.log(
          "Joined chat as:",
          savedUsername
        );
      } else {
        console.log(
          "User is not logged in. Chat join skipped."
        );
      }
    };

    const handlePrivateMessage = (newMessage) => {
      console.log(
        "App received private message:",
        newMessage
      );

      const currentUsername =
        localStorage.getItem("username") || "";

      if (
        !newMessage ||
        !newMessage.username ||
        String(newMessage.username).toLowerCase() ===
          String(currentUsername).toLowerCase()
      ) {
        return;
      }

      /*
       * IMPORTANT:
       * App.js notification system should NOT save private
       * messages into chatMessages.
       *
       * Chat.js is responsible for storing/rendering messages.
       * Saving the same message here can mix old/stale avatar
       * information with the current chat message.
       */

      const activeChat =
        localStorage.getItem("activeChatUser");

      if (
        String(activeChat || "").toLowerCase() ===
        String(newMessage.username || "").toLowerCase()
      ) {
        return;
      }

      setUnreadCounts((oldCounts) => {
        return {
          ...oldCounts,
          [newMessage.username]:
            (oldCounts[newMessage.username] || 0) + 1,
        };
      });

      // Unicode-safe notification icon
      setNotification(
        "\uD83D\uDD14 New message from " +
          newMessage.username
      );

      setTimeout(() => {
        setNotification("");
      }, 5000);
    };

    const handleChatOpened = (event) => {
      const openedUser = event.detail;

      if (!openedUser) {
        return;
      }

      setUnreadCounts((oldCounts) => {
        const newCounts = {
          ...oldCounts,
        };

        delete newCounts[openedUser];

        return newCounts;
      });
    };

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "receive_private_message",
      handlePrivateMessage
    );

    window.addEventListener(
      "chat_opened",
      handleChatOpened
    );

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "receive_private_message",
        handlePrivateMessage
      );

      window.removeEventListener(
        "chat_opened",
        handleChatOpened
      );
    };
  }, []);

  const totalUnread =
    Object.values(unreadCounts).reduce(
      (total, count) =>
        total + count,
      0
    );

  return (
    <BrowserRouter>
      <Navbar />

      {notification && (
        <div
          style={{
            position: "fixed",
            top: "70px",
            right: "20px",
            zIndex: 9999,
            background: "#fff3cd",
            color: "#664d03",
            border: "1px solid #ffc107",
            borderRadius: "10px",
            padding: "12px 18px",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.15)",
            fontWeight: "bold",
          }}
        >
          {notification}

          {totalUnread > 0 && (
            <span
              style={{
                marginLeft: "8px",
                background: "#dc3545",
                color: "white",
                borderRadius: "20px",
                padding: "2px 7px",
                fontSize: "12px",
              }}
            >
              {totalUnread}
            </span>
          )}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/chat"
          element={<Chat />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        <Route
          path="/admin"
          element={<Admin />}
        />

        <Route
          path="/my-promotions"
          element={<MyPromotions />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;