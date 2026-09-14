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
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || ""
  );

  const [notification, setNotification] = useState("");

  const [unreadCounts, setUnreadCounts] = useState(() => {
    const saved = localStorage.getItem("unreadCounts");

    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const checkUser = () => {
      const savedUsername =
        localStorage.getItem("username") || "";

      const loggedIn =
        localStorage.getItem("login") === "true";

      if (loggedIn && savedUsername) {
        setUsername(savedUsername);
      } else {
        setUsername("");
      }
    };

    checkUser();

    window.addEventListener("storage", checkUser);

    return () => {
      window.removeEventListener("storage", checkUser);
    };
  }, []);

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
        newMessage.username === currentUsername
      ) {
        return;
      }

      const saved =
        localStorage.getItem("chatMessages");

      let oldMessages = [];

      try {
        oldMessages = saved
          ? JSON.parse(saved)
          : [];
      } catch {
        oldMessages = [];
      }

      const messageExists =
        oldMessages.some(
          (item) =>
            item.username === newMessage.username &&
            item.to === newMessage.to &&
            item.message === newMessage.message &&
            item.image === newMessage.image &&
            item.audio === newMessage.audio &&
            item.time === newMessage.time
        );

      if (!messageExists) {
        localStorage.setItem(
          "chatMessages",
          JSON.stringify([
            ...oldMessages,
            newMessage,
          ])
        );
      }

      const activeChat =
        localStorage.getItem("activeChatUser");

      if (
        activeChat === newMessage.username
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

      setNotification(
        "🔔 New message from " +
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