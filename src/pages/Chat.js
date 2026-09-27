import React, { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../socket";
import "./Chat.css";

function Chat() {
  const username = localStorage.getItem("username") || "Guest";
  const profileImage = localStorage.getItem("profileImage") || "";

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatMessages");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [onlineUsers, setOnlineUsers] = useState([]);

  const [viewedProfile, setViewedProfile] = useState(null);
  const [showProfileViewer, setShowProfileViewer] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  /*
    IMPORTANT:
    Har doosre user ki profile picture alag store hogi.
    Is se received message mein current logged-in user
    ki picture dobara show nahi hogi.
  */
  const [chatProfileImages, setChatProfileImages] = useState({});

  const [selectedUser, setSelectedUser] = useState(() => {
    return localStorage.getItem("activeChatUser") || "";
  });

  const [chatMode, setChatMode] = useState("private");

  const [publicMessages, setPublicMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("publicChatMessages");
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      return [];
    }
  });

  const [promotions, setPromotions] = useState([]);

  const [showProductForm, setShowProductForm] = useState(false);

  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productLink, setProductLink] = useState("");
  const [productImage, setProductImage] = useState("");

  const [productSubmitted, setProductSubmitted] = useState(false);

  const [approvalStatus, setApprovalStatus] = useState("");

  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const [unreadPrivateMessages, setUnreadPrivateMessages] = useState({});

  const [privateBlockStatus, setPrivateBlockStatus] = useState({
    blockedByMe: false,
    blockedMe: false
  });

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatBoxRef = useRef(null);
  const selectedUserUnreadRef = useRef(selectedUser);
  const chatModeUnreadRef = useRef(chatMode);

  useEffect(() => {
    selectedUserUnreadRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    chatModeUnreadRef.current = chatMode;
  }, [chatMode]);

  const emojis = [
    "\u{1F600}","\u{1F602}","\u{1F923}","\u{1F60A}","\u{1F60D}","\u{1F970}","\u{1F618}","\u{1F60E}",
    "\u{1F929}","\u{1F973}","\u{1F622}","\u{1F62D}","\u{1F624}","\u{1F621}",
    "\u{1F631}","\u{1F628}","\u{1F914}","\u{1F917}","\u{1F634}","\u{1F91F}","\u{1F44E}",
    "\u{1F44C}","\u{270C}\uFE0F","\u{1F91E}","\u{1F64F}","\u{1F4AA}","\u{1F44B}","\u{2764}\uFE0F","\u{1F49B}",
    "\u{1F49A}","\u{1F499}","\u{1F49C}","\u{1F5A4}","\u{1F494}","\u{1F495}","\u{1F496}","\u{1F525}",
    "\u{2728}","\u{1F4AF}","\u{1F389}","\u{1F38A}","\u{1F680}","\u{1F308}","\u{2615}","\u{26BD}",
    "\u{1F3AE}","\u{1F3B5}","\u{1F3B6}","\u{1F4F1}","\u{1F4BB}","\u{1F4F7}","\u{1F697}"
  ];

  /* ==========================================
     USER PROFILE VIEWER
  ========================================== */

  useEffect(() => {
    const handleUserProfileResult = (data) => {
      setProfileLoading(false);

      if (!data || !data.success) {
        setViewedProfile(null);
        setProfileError(
          data?.message || "Profile load nahi ho saki."
        );
        return;
      }

      const userData = data.user || null;

      /*
        IMPORTANT:
        Jab kisi user ka profile server se milta hai,
        uski profile image chat ke liye cache kar dein.
      */
      if (
        userData &&
        userData.username &&
        userData.profileImage
      ) {
        setChatProfileImages((oldImages) => ({
          ...oldImages,
          [userData.username]: userData.profileImage
        }));
      }

      setProfileError("");
      setViewedProfile(userData);
      setShowProfileViewer(true);
    };

    socket.on(
      "user_profile_result",
      handleUserProfileResult
    );

    return () => {
      socket.off(
        "user_profile_result",
        handleUserProfileResult
      );
    };
  }, []);

  /*
    Kisi bhi message ke sender ki profile picture
    server se mangwa kar cache karne ka helper.
  */
  const requestChatProfileImage = useCallback((targetUsername) => {
    if (!targetUsername) return;

    if (
      String(targetUsername).toLowerCase() ===
      String(username).toLowerCase()
    ) {
      return;
    }

    const alreadyCached =
      chatProfileImages[targetUsername];

    if (alreadyCached) {
      return;
    }

    socket.emit(
      "get_user_profile",
      {
        username: targetUsername
      }
    );
  }, [username, chatProfileImages]);

  /*
    Existing private/public messages mein jitne
    doosre users hain unki profile images load karna.
  */
  useEffect(() => {
    const usersToLoad = new Set();

    messages.forEach((item) => {
      if (
        item &&
        item.username &&
        String(item.username).toLowerCase() !==
          String(username).toLowerCase()
      ) {
        usersToLoad.add(item.username);
      }
    });

    publicMessages.forEach((item) => {
      if (
        item &&
        item.username &&
        String(item.username).toLowerCase() !==
          String(username).toLowerCase()
      ) {
        usersToLoad.add(item.username);
      }
    });

    usersToLoad.forEach((targetUsername) => {
      if (
        !chatProfileImages[targetUsername]
      ) {
        requestChatProfileImage(targetUsername);
      }
    });
  }, [
    requestChatProfileImage,
    messages,
    publicMessages,
    username,
    chatProfileImages
  ]);

  const openUserProfile = (targetUsername) => {
    if (!targetUsername) {
      return;
    }

    if (
      String(targetUsername).toLowerCase() ===
      String(username).toLowerCase()
    ) {
      return;
    }

    setProfileLoading(true);
    setProfileError("");
    setViewedProfile(null);
    setShowProfileViewer(true);

    socket.emit(
      "get_user_profile",
      {
        username: targetUsername
      }
    );
  };

  const closeUserProfile = () => {
    setShowProfileViewer(false);
    setViewedProfile(null);
    setProfileError("");
    setProfileLoading(false);
  };

  /* ==========================================
     AUTO SCROLL
  ========================================== */

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop =
        chatBoxRef.current.scrollHeight;
    }
  }, [
    messages,
    publicMessages,
    selectedUser,
    chatMode
  ]);

  /* ==========================================
     NOTIFICATIONS
  ========================================== */

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  /* ==========================================
     SOCKET + ONLINE USERS
  ========================================== */

  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join_chat", username);
    };

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users || []);
    };

    socket.on("connect", handleConnect);
    socket.on("online_users", handleOnlineUsers);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("online_users", handleOnlineUsers);
    };
  }, [username]);

  /* ==========================================
     PROMOTIONS
  ========================================== */

  useEffect(() => {
    const handlePromotions = (promotionList) => {
      setPromotions(promotionList || []);
    };

    socket.on("promotions_data", handlePromotions);

    if (socket.connected) {
      socket.emit("get_promotions");
    }

    const refreshPromotions = setInterval(() => {
      if (socket.connected) {
        socket.emit("get_promotions");
      }
    }, 10000);

    return () => {
      socket.off("promotions_data", handlePromotions);
      clearInterval(refreshPromotions);
    };
  }, []);

  /* ==========================================
     PROMOTION CREATED / APPROVAL RESPONSE
  ========================================== */

  useEffect(() => {
    const handlePromotionCreated = (promotion) => {
      if (!promotion) return;

      if (
        String(promotion.username || "").toLowerCase() ===
        String(username || "").toLowerCase()
      ) {
        if (
          promotion.approved === true &&
          promotion.active === true
        ) {
          setApprovalStatus("approved");
        } else {
          setApprovalStatus("pending");
        }
      }

      if (
        promotion.approved === true &&
        promotion.active === true
      ) {
        setPromotions((oldPromotions) => {
          const exists = oldPromotions.some(
            (item) =>
              String(item._id) ===
              String(promotion._id)
          );

          if (exists) {
            return oldPromotions.map((item) =>
              String(item._id) ===
              String(promotion._id)
                ? promotion
                : item
            );
          }

          return [
            promotion,
            ...oldPromotions
          ].slice(0, 10);
        });
      }
    };

    const handlePromotionApproved = (promotion) => {
      if (!promotion) return;

      if (
        String(promotion.username || "").toLowerCase() ===
        String(username || "").toLowerCase()
      ) {
        setApprovalStatus("approved");
        setProductSubmitted(false);
      }

      if (
        promotion.approved === true &&
        promotion.active === true
      ) {
        setPromotions((oldPromotions) => {
          const exists = oldPromotions.some(
            (item) =>
              String(item._id) ===
              String(promotion._id)
          );

          if (exists) {
            return oldPromotions.map((item) =>
              String(item._id) ===
              String(promotion._id)
                ? promotion
                : item
            );
          }

          return [
            promotion,
            ...oldPromotions
          ].slice(0, 10);
        });
      }
    };

    const handlePromotionUpdated = (promotion) => {
      if (!promotion) return;

      if (
        String(promotion.username || "").toLowerCase() ===
        String(username || "").toLowerCase()
      ) {
        if (
          promotion.approved === true &&
          promotion.active === true
        ) {
          setApprovalStatus("approved");
        } else if (
          promotion.approved === false
        ) {
          setApprovalStatus("pending");
        }
      }

      setPromotions((oldPromotions) => {
        if (
          promotion.approved !== true ||
          promotion.active !== true
        ) {
          return oldPromotions.filter(
            (item) =>
              String(item._id) !==
              String(promotion._id)
          );
        }

        const exists = oldPromotions.some(
          (item) =>
            String(item._id) ===
            String(promotion._id)
        );

        if (exists) {
          return oldPromotions.map((item) =>
            String(item._id) ===
            String(promotion._id)
              ? promotion
              : item
          );
        }

        return [
          promotion,
          ...oldPromotions
        ].slice(0, 10);
      });
    };

    const handlePromotionDeleted = (data) => {
      if (!data || !data.deletedId) return;

      setPromotions((oldPromotions) =>
        oldPromotions.filter(
          (item) =>
            String(item._id) !==
            String(data.deletedId)
        )
      );
    };

    socket.on(
      "promotion_created",
      handlePromotionCreated
    );

    socket.on(
      "promotion_approved",
      handlePromotionApproved
    );

    socket.on(
      "promotion_updated",
      handlePromotionUpdated
    );

    socket.on(
      "promotion_deleted",
      handlePromotionDeleted
    );

    return () => {
      socket.off(
        "promotion_created",
        handlePromotionCreated
      );

      socket.off(
        "promotion_approved",
        handlePromotionApproved
      );

      socket.off(
        "promotion_updated",
        handlePromotionUpdated
      );

      socket.off(
        "promotion_deleted",
        handlePromotionDeleted
      );
    };
  }, [username]);

  /* ==========================================
     PRIVATE CHAT HISTORY
  ========================================== */

  useEffect(() => {
    if (
      chatMode !== "private" ||
      !username ||
      !selectedUser
    ) {
      setPrivateBlockStatus({
        blockedByMe: false,
        blockedMe: false
      });
      return;
    }

    const handleChatHistory = (history) => {
      setMessages(history || []);
    };

    const handlePrivateBlockStatus = (data) => {
      if (
        !data ||
        data.username !== selectedUser
      ) {
        return;
      }

      setPrivateBlockStatus({
        blockedByMe: data.blockedByMe === true,
        blockedMe: data.blockedMe === true
      });
    };

    const handlePrivateBlockResult = (data) => {
      if (!data || !data.success) {
        return;
      }

      if (
        data.blockedUsername !== selectedUser
      ) {
        return;
      }

      setPrivateBlockStatus((prev) => ({
        ...prev,
        blockedByMe: data.action === "block"
      }));
    };

    socket.on(
      "chat_history",
      handleChatHistory
    );

    socket.on(
      "private_block_result",
      handlePrivateBlockResult
    );

    socket.on(
      "private_block_status",
      handlePrivateBlockStatus
    );

    socket.emit(
      "get_chat_history",
      {
        username,
        selectedUser
      }
    );

    socket.emit(
      "get_private_block_status",
      {
        username,
        otherUsername: selectedUser
      }
    );

    /*
      Selected user ki profile image bhi request
      kar dein agar cache mein nahi hai.
    */
    requestChatProfileImage(selectedUser);

    return () => {
      socket.off(
        "chat_history",
        handleChatHistory
      );

      socket.off(
        "private_block_result",
        handlePrivateBlockResult
      );

      socket.off(
        "private_block_status",
        handlePrivateBlockStatus
      );
    };
  }, [
    chatMode,
    selectedUser,
    requestChatProfileImage,
  ]);

  /* ==========================================
     PUBLIC CHAT HISTORY
  ========================================== */

  useEffect(() => {
    if (chatMode !== "public") {
      return;
    }

    const handlePublicHistory = (history) => {
      setPublicMessages(history || []);
    };

    socket.on(
      "public_chat_history",
      handlePublicHistory
    );

    socket.emit(
      "get_public_chat_history"
    );

    return () => {
      socket.off(
        "public_chat_history",
        handlePublicHistory
      );
    };
  }, [chatMode]);

  /* ==========================================
     RECEIVE PRIVATE MESSAGE
  ========================================== */

  useEffect(() => {
    const handleReceiveMessage = (newMessage) => {
      if (!newMessage) {
        return;
      }

      /*
        IMPORTANT:
        Received message ke sender ki profile
        picture server se mangwa rahe hain.
      */
      if (
        newMessage.username &&
        String(newMessage.username).toLowerCase() !==
          String(username).toLowerCase()
      ) {
        /*
          Agar server already profileImage bhej raha
          ho to pehle usko cache kar dein.
        */
        if (newMessage.profileImage) {
          setChatProfileImages((oldImages) => ({
            ...oldImages,
            [newMessage.username]:
              newMessage.profileImage
          }));
        } else if (
          newMessage.senderProfileImage
        ) {
          setChatProfileImages((oldImages) => ({
            ...oldImages,
            [newMessage.username]:
              newMessage.senderProfileImage
          }));
        } else if (
          newMessage.avatar
        ) {
          setChatProfileImages((oldImages) => ({
            ...oldImages,
            [newMessage.username]:
              newMessage.avatar
          }));
        } else {
          requestChatProfileImage(
            newMessage.username
          );
        }
      }

      if (
        newMessage.username !== username &&
        newMessage.to === username
      ) {
        const sender = newMessage.username;

        const isCurrentOpenChat =
          chatModeUnreadRef.current === "private" &&
          selectedUserUnreadRef.current &&
          selectedUserUnreadRef.current.toLowerCase() ===
            sender.toLowerCase();

        if (!isCurrentOpenChat) {
          setUnreadPrivateMessages((oldUnread) => ({
            ...oldUnread,
            [sender]: (oldUnread[sender] || 0) + 1
          }));
        }
      }

      if (
        newMessage.username !== username &&
        newMessage.to === username &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        let notificationBody = "New message";

        if (newMessage.message) {
          notificationBody = newMessage.message;
        } else if (newMessage.image) {
          notificationBody = "\u{1F4F7} Photo";
        } else if (newMessage.audio) {
          notificationBody = "\u{1F3A4} Voice message";
        }

        try {
          const notification =
            new Notification(
              "New message from " +
                newMessage.username,
              {
                body: notificationBody,
                /*
                  Notification mein bhi sender ki image
                  use karne ki koshish.
                */
                icon:
                  newMessage.profileImage ||
                  newMessage.senderProfileImage ||
                  profileImage ||
                  undefined
              }
            );

          notification.onclick = () => {
            window.focus();
            notification.close();

            setChatMode("private");
            setSelectedUser(
              newMessage.username
            );

            localStorage.setItem(
              "activeChatUser",
              newMessage.username
            );
          };
        } catch (error) {
          console.log(
            "Notification error:",
            error
          );
        }
      }

      setMessages((oldMessages) => {
        const alreadyExists =
          oldMessages.some(
            (item) =>
              item.username ===
                newMessage.username &&
              item.to === newMessage.to &&
              item.message ===
                newMessage.message &&
              item.image ===
                newMessage.image &&
              item.audio ===
                newMessage.audio &&
              item.time ===
                newMessage.time
          );

        if (alreadyExists) {
          return oldMessages;
        }

        return [
          ...oldMessages,
          newMessage
        ];
      });
    };

    socket.on(
      "receive_private_message",
      handleReceiveMessage
    );

    return () => {
      socket.off(
        "receive_private_message",
        handleReceiveMessage
      );
    };
  }, [
    username,
    profileImage,
    requestChatProfileImage
  ]);
  /* ==========================================
     RECEIVE PUBLIC MESSAGE
  ========================================== */

  useEffect(() => {
    const handleReceivePublicMessage =
      (newMessage) => {

        if (
          newMessage &&
          newMessage.username &&
          String(newMessage.username).toLowerCase() !==
            String(username).toLowerCase()
        ) {
          if (newMessage.profileImage) {
            setChatProfileImages((oldImages) => ({
              ...oldImages,
              [newMessage.username]:
                newMessage.profileImage
            }));
          } else if (
            newMessage.senderProfileImage
          ) {
            setChatProfileImages((oldImages) => ({
              ...oldImages,
              [newMessage.username]:
                newMessage.senderProfileImage
            }));
          } else if (
            newMessage.avatar
          ) {
            setChatProfileImages((oldImages) => ({
              ...oldImages,
              [newMessage.username]:
                newMessage.avatar
            }));
          } else {
            requestChatProfileImage(
              newMessage.username
            );
          }
        }

        setPublicMessages(
          (oldMessages) => {
            const alreadyExists =
              oldMessages.some(
                (item) =>
                  item.username ===
                    newMessage.username &&
                  item.message ===
                    newMessage.message &&
                  item.time ===
                    newMessage.time
              );

            if (alreadyExists) {
              return oldMessages;
            }

            return [
              ...oldMessages,
              newMessage
            ];
          }
        );
      };

    socket.on(
      "receive_public_message",
      handleReceivePublicMessage
    );

    return () => {
      socket.off(
        "receive_public_message",
        handleReceivePublicMessage
      );
    };
  }, [username, requestChatProfileImage]);
  /* ==========================================
     SAVE HISTORY
  ========================================== */

  useEffect(() => {
    try {
      localStorage.setItem(
        "chatMessages",
        JSON.stringify(messages)
      );
    } catch (error) {}
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "publicChatMessages",
        JSON.stringify(
          publicMessages
        )
      );
    } catch (error) {}
  }, [publicMessages]);

  /* ==========================================
     USER SELECT
  ========================================== */

  const handleUserSelect = (e) => {
    const user = e.target.value;

    setSelectedUser(user);
    setShowEmoji(false);

    if (user) {
      localStorage.setItem(
        "activeChatUser",
        user
      );

      requestChatProfileImage(user);
    } else {
      localStorage.removeItem(
        "activeChatUser"
      );
    }
  };

  const handlePrivateBlockToggle = () => {
    if (!selectedUser) {
      return;
    }

    if (privateBlockStatus.blockedByMe) {
      socket.emit("unblock_private_user", {
        username,
        blockedUsername: selectedUser
      });
    } else {
      socket.emit("block_private_user", {
        username,
        blockedUsername: selectedUser
      });
    }
  };

  /* ==========================================
     CHAT MODE
  ========================================== */

  const openPrivateChat = () => {
    setChatMode("private");
    setShowEmoji(false);
  };

  const openPublicChat = () => {
    setChatMode("public");
    setShowEmoji(false);
  };

  /* ==========================================
     PRIVATE MESSAGE
  ========================================== */

  const sendPrivateMessage = () => {
    const cleanMessage =
      message.trim();

    if (!cleanMessage) return;

    if (!selectedUser) {
      alert(
        "Pehle user select karein."
      );
      return;
    }

    const newMessage = {
      username,
      to: selectedUser,
      message: cleanMessage,
      image: "",
      audio: "",
      /*
        Sender ki current profile picture message
        ke andar bhi save hogi.
      */
      profileImage: profileImage || "",
      time:
        new Date().toLocaleTimeString()
    };

    socket.emit(
      "send_private_message",
      newMessage
    );

    setMessages(
      (oldMessages) => [
        ...oldMessages,
        newMessage
      ]
    );

    setMessage("");
  };

  /* ==========================================
     PUBLIC MESSAGE
  ========================================== */

  const sendPublicMessage = () => {
    const cleanMessage =
      message.trim();

    if (!cleanMessage) return;

    if (
      username === "Guest" ||
      username === "Guest User"
    ) {
      alert(
        "Public Chat ke liye login zaroori hai."
      );
      return;
    }

    const newMessage = {
      username,
      message: cleanMessage,
      profileImage: profileImage || "",
      time:
        new Date().toLocaleTimeString()
    };

    socket.emit(
      "send_public_message",
      newMessage
    );

    setMessage("");
  };

  const sendMessage = () => {
    if (chatMode === "public") {
      sendPublicMessage();
    } else {
      sendPrivateMessage();
    }
  };

  /* ==========================================
     IMAGE
  ========================================== */

  const handleImage = (e) => {
    const file =
      e.target.files[0];

    if (!file) return;

    if (chatMode === "public") {
      alert(
        "Public Chat mein filhal sirf text messages available hain."
      );

      e.target.value = "";
      return;
    }

    if (!selectedUser) {
      alert(
        "Pehle user select karein."
      );

      e.target.value = "";
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const newMessage = {
        username,
        to: selectedUser,
        message: "",
        image: reader.result,
        audio: "",
        profileImage: profileImage || "",
        time:
          new Date().toLocaleTimeString()
      };

      socket.emit(
        "send_private_message",
        newMessage
      );

      setMessages(
        (oldMessages) => [
          ...oldMessages,
          newMessage
        ]
      );
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ==========================================
     EMOJI
  ========================================== */
  const addEmoji = (emoji) => {
    setMessage(
      (oldMessage) =>
        oldMessage + emoji
    );
  };
  /* ==========================================
     VOICE
  ========================================== */

  const startVoice = async () => {
    if (chatMode === "public") {
      alert(
        "Public Chat mein filhal voice messages available nahi hain."
      );
      return;
    }

    if (!selectedUser) {
      alert(
        "Pehle user select karein."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true
          }
        );

      const recorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        recorder;

      audioChunksRef.current = [];

      recorder.ondataavailable =
        (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

      recorder.onstop = () => {
        const audioBlob =
          new Blob(
            audioChunksRef.current,
            {
              type: "audio/webm"
            }
          );

        const reader =
          new FileReader();

        reader.onload = () => {
          const newMessage = {
            username,
            to: selectedUser,
            message: "",
            image: "",
            audio: reader.result,
            profileImage: profileImage || "",
            time:
              new Date().toLocaleTimeString()
          };

          socket.emit(
            "send_private_message",
            newMessage
          );

          setMessages(
            (oldMessages) => [
              ...oldMessages,
              newMessage
            ]
          );
        };

        reader.readAsDataURL(
          audioBlob
        );

        stream
          .getTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      alert(
        "Microphone permission nahi mili."
      );
    }
  };

  const stopVoice = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state ===
        "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleVoiceButton = () => {
    if (isRecording) {
      stopVoice();
    } else {
      startVoice();
    }
  };

  /* ==========================================
     REPORT
  ========================================== */

  const reportPublicMessage = (item) => {
    if (
      item.username === username
    ) {
      return;
    }

    const messageId =
      item._id
        ? String(item._id)
        : item.messageId
        ? String(item.messageId)
        : item.id
        ? String(item.id)
        : `${item.username}-${item.time}-${item.message}`;

    if (!messageId) {
      alert(
        "Is message ko report nahi kiya ja sakta."
      );
      return;
    }

    const reportChoice =
      window.prompt(
        "Report reason select karein:\n\n" +
          "1 - Scam / Fraud\n" +
          "2 - Adult / Sexual Content\n" +
          "3 - Harassment / Abuse\n" +
          "4 - Spam / Advertisement\n" +
          "5 - Hate / Offensive Content\n" +
          "6 - Other\n\n" +
          "Number likhein:"
      );

    if (reportChoice === null) {
      return;
    }

    const reportReasons = {
      "1": "Scam / Fraud",
      "2": "Adult / Sexual Content",
      "3": "Harassment / Abuse",
      "4": "Spam / Advertisement",
      "5": "Hate / Offensive Content",
      "6": "Other"
    };

    const selectedReason =
      reportReasons[
        reportChoice.trim()
      ];

    if (!selectedReason) {
      alert(
        "Please 1 se 6 tak koi valid option select karein."
      );
      return;
    }

    let finalReason =
      selectedReason;

    if (
      selectedReason === "Other"
    ) {
      const otherReason =
        window.prompt(
          "Report ka reason likhein:"
        );

      if (otherReason === null) {
        return;
      }

      if (!otherReason.trim()) {
        alert(
          "Report ka reason zaroor likhein."
        );
        return;
      }

      finalReason =
        otherReason.trim();
    }

    const reportData = {
      messageId: messageId,
      reporter: username,
      reportedUsername:
        item.username,
      message:
        item.message || "",
      messageTime:
        item.time || "",
      reason:
        finalReason
    };

    console.log(
      "REPORT SUBMIT:",
      reportData
    );

    socket.emit(
      "report_public_message",
      reportData
    );

    alert(
      "Report successfully submit ho gayi."
    );
  };

  const handlePublicMessageClick =
    (item) => {
      if (
        item.username === username
      ) {
        return;
      }

      const wantsReport =
        window.confirm(
          "Is message ko report karna hai?\n\nOK = Report\nCancel = Close"
        );

      if (wantsReport) {
        reportPublicMessage(item);
      }
    };

  /* ==========================================
     ENTER
  ========================================== */

  const handleEnter = (e) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ==========================================
     PROMOTION CLICK
  ========================================== */

  const handlePromotionClick =
    (promotion) => {
      if (
        promotion &&
        promotion.link
      ) {
        window.open(
          promotion.link,
          "_blank",
          "noopener,noreferrer"
        );

        return;
      }

      alert(
        "Promotion details coming soon."
      );
    };

  /* ==========================================
     PRODUCT IMAGE
  ========================================== */

  const handleProductImage = (e) => {
    const file =
      e.target.files[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      setProductImage(
        reader.result
      );
    };

    reader.readAsDataURL(file);
  };

  /* ==========================================
     PRODUCT SUBMISSION
  ========================================== */

  const submitProductForApproval =
    () => {
      if (
        username === "Guest" ||
        username === "Guest User"
      ) {
        alert(
          "Product submit karne ke liye login zaroori hai."
        );
        return;
      }

      if (!productTitle.trim()) {
        alert(
          "Product name zaroor likhein."
        );
        return;
      }

      if (
        !productDescription.trim()
      ) {
        alert(
          "Product description zaroor likhein."
        );
        return;
      }

      if (!productImage) {
        alert(
          "Product ki picture select karein."
        );
        return;
      }

      const productData = {
        username: username,

        title:
          productTitle.trim(),

        description:
          productPrice.trim()
            ? "Price: " +
              productPrice.trim() +
              "\n\n" +
              productDescription.trim()
            : productDescription.trim(),

        link:
          productLink.trim(),

        image:
          productImage,

        promotionTitle: "\u{1F6CD}\uFE0F Product Promotion",

        active: false,

        status:
          "pending",

        approved: false
      };

      console.log(
        "PRODUCT SUBMIT FOR APPROVAL:",
        productData
      );

      socket.emit(
        "create_promotion",
        productData
      );

      setApprovalStatus(
        "pending"
      );

      setProductSubmitted(
        true
      );

      alert(
        "Product submit ho gaya.\n\n" +
          "\u23F3 Approval Needed\n\n" +
          "Admin Armani approval ke baad aapki promotion public Featured Promotions mein show hogi."
      );

      setProductTitle("");
      setProductPrice("");
      setProductDescription("");
      setProductLink("");
      setProductImage("");

      if (socket.connected) {
        setTimeout(() => {
          socket.emit(
            "get_promotions"
          );
        }, 500);
      }
    };

  /* ==========================================
     CLOSE PRODUCT FORM
  ========================================== */

  const closeProductForm = () => {
    setShowProductForm(false);

    setProductTitle("");
    setProductPrice("");
    setProductDescription("");
    setProductLink("");
    setProductImage("");
  };

  return (
    <div className="chat-page-layout">

      {/* ======================================
          CHAT
      ====================================== */}

      {/* ONLINE USERS - LEFT SIDE */}
      <aside className="online-users-panel">
        <div className="online-users-title">
          {"\u{1F7E2} Online Users"}
        </div>

        <div className="online-users-count">
          {onlineUsers.filter((user) => user !== username).length} Users Online
        </div>

        <div className="online-users-list">
          {onlineUsers.filter((user) => user !== username).length > 0 ? (
            onlineUsers
              .filter((user) => user !== username)
              .map((user) => (
                <button
                  key={user}
                  type="button"
                  className={
                    "online-user-item " +
                    (selectedUser === user && chatMode === "private"
                      ? "online-user-item-selected"
                      : "")
                  }
                  onClick={() => {
                    setChatMode("private");
                    setSelectedUser(user);
                    setShowEmoji(false);
                    localStorage.setItem("activeChatUser", user);

                    requestChatProfileImage(user);

                    setUnreadPrivateMessages((oldUnread) => {
                      const next = { ...oldUnread };
                      delete next[user];
                      return next;
                    });
                  }}
                >
                  <span className="online-user-dot">
                    {"\u2022"}
                  </span>

                  <span className="online-user-name">
                    {user}
                  </span>

                  {unreadPrivateMessages[user] > 0 && (
                    <span className="online-user-unread">
                      {unreadPrivateMessages[user]}
                    </span>
                  )}
                </button>
              ))
          ) : (
            <div className="online-users-empty">
              Abhi koi aur user online nahi hai.
            </div>
          )}
        </div>
      </aside>

      <div className="chat-container">

        <div className="chat-header">

          <div className="chat-user">

            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
                className="chat-avatar"
              />
            ) : (
              <div className="chat-avatar-placeholder">
                {"\u{1F4AC} Selling GupShup"}
              </div>
            )}

            <div>
              <h2>
                {"\u{1F4AC} Selling GupShup"}
              </h2>

              <span>
                Logged in as: {username}
              </span>
            </div>

          </div>

        </div>

        <div
          className="user-selection"
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >

          <button
            type="button"
            onClick={
              openPrivateChat
            }
            style={{
              cursor: "pointer",
              fontWeight:
                chatMode === "private"
                  ? "bold"
                  : "normal"
            }}
          >
            {"\u{1F512} Private Chat"}
          </button>

          <button
            type="button"
            onClick={
              openPublicChat
            }
            style={{
              cursor: "pointer",
              fontWeight:
                chatMode === "public"
                  ? "bold"
                  : "normal"
            }}
          >
            {"\u{1F310} Public Chat"}
          </button>

        </div>

        {Object.keys(unreadPrivateMessages).length > 0 && (
          <div
            id="unread-private-chat-boxes"
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "6px 8px",
              alignItems: "center"
            }}
          >
            {Object.entries(unreadPrivateMessages).map(
              ([sender, count]) => (
                <button
                  key={sender}
                  type="button"
                  onClick={() => {
                    setChatMode("private");
                    setSelectedUser(sender);
                    setShowEmoji(false);

                    localStorage.setItem(
                      "activeChatUser",
                      sender
                    );

                    requestChatProfileImage(sender);

                    setUnreadPrivateMessages(
                      (oldUnread) => {
                        const nextUnread = {
                          ...oldUnread
                        };

                        delete nextUnread[sender];

                        return nextUnread;
                      }
                    );
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: "1px solid #ddd",
                    borderRadius: "18px",
                    background: "#fff",
                    padding: "6px 10px",
                    cursor: "pointer",
                    boxShadow:
                      "0 1px 4px rgba(0,0,0,0.12)"
                  }}
                >
                  <span>{"\u{1F4AC}"}</span>

                  <span
                    style={{
                      fontWeight: "bold"
                    }}
                  >
                    {sender}
                  </span>

                  <span
                    style={{
                      minWidth: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: "#1877F2",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            )}
          </div>
        )}

        {chatMode === "private" && (
          <div className="user-selection">

            <label>
              Chat with:
            </label>

            <select
              value={selectedUser}
              onChange={
                handleUserSelect
              }
            >

              <option value="">
                Select User
              </option>

              {onlineUsers
                .filter(
                  (user) =>
                    user !== username
                )
                .map(
                  (user) => (
                    <option
                      key={user}
                      value={user}
                    >
                      {"\u{1F7E2} Online - " + user}
                    </option>
                  )
                )}

            </select>

            {selectedUser && (
              <button
                type="button"
                onClick={handlePrivateBlockToggle}
                style={{
                  cursor: "pointer",
                  fontWeight: "bold"
                }}
              >
                {privateBlockStatus.blockedByMe
                  ? "Unblock User"
                  : "Block User"}
              </button>
            )}

          </div>
        )}

        {chatMode === "public" && (
          <div
            style={{
              textAlign: "center",
              padding: "8px",
              fontWeight: "bold"
            }}
          >

            <div>
              {"\u23F3 Approval Needed"}
            </div>

            <div
              style={{
                fontSize: "13px",
                fontWeight: "normal",
                marginTop: "4px",
                color: "#16a34a"
              }}
            >
              {onlineUsers.length}{" "}
              {onlineUsers.length === 1
                ? "user"
                : "users"}{" "}
              online
            </div>

          </div>
        )}

        <div
          className="chat-box"
          ref={chatBoxRef}
        >

          {chatMode ===
            "private" &&
            !selectedUser && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#777"
                }}
              >
                Kisi online user ko
                select karein aur
                private chat start
                karein.
              </div>
            )}

          {chatMode ===
            "private" &&
            selectedUser &&
            messages
              .filter((item) => {
                const sent =
                  item.username ===
                    username &&
                  item.to ===
                    selectedUser;

                const received =
                  item.username ===
                    selectedUser &&
                  item.to ===
                    username;

                return (
                  sent ||
                  received
                );
              })
              .map(
                (item, index) => {

                  const isMine =
                    item.username ===
                    username;

                  /*
                    IMPORTANT:
                    Apne message ke liye hamesha
                    logged-in user ki picture.
                    Received message ke liye
                    sender ki cached/profile picture.
                  */
                  const messageAvatar =
                    isMine
                      ? (
                          item.profileImage ||
                          profileImage ||
                          ""
                        )
                      : (
                          item.profileImage ||
                          item.senderProfileImage ||
                          item.avatar ||
                          chatProfileImages[item.username] ||
                          ""
                        );

                  return (
                    <div
                      key={
                        item._id
                          ? String(
                              item._id
                            )
                          : `${item.username}-${item.time}-${index}`
                      }
                      className={
                        isMine
                          ? "message-row my-message-row"
                          : "message-row"
                      }
                    >

                      <div
                        className="message-avatar"
                        onClick={() => {
                          if (!isMine) {
                            openUserProfile(
                              item.username
                            );
                          }
                        }}
                        style={{
                          cursor: isMine
                            ? "default"
                            : "pointer"
                        }}
                      >

                        {messageAvatar ? (
                          <img
                            src={messageAvatar}
                            alt={
                              item.username +
                              " Profile"
                            }
                          />
                        ) : (
                          "\u{1F464}"
                        )}

                      </div>

                      <div className="message-details">

                        <strong
                          onClick={() => {
                            if (!isMine) {
                              openUserProfile(
                                item.username
                              );
                            }
                          }}
                          style={{
                            cursor: isMine
                              ? "default"
                              : "pointer"
                          }}
                        >
                          {item.username}
                        </strong>

                        {item.image && (
                          <div className="message-bubble">

                            <img
                              src={
                                item.image
                              }
                              alt="Shared"
                              className="chat-shared-image"
                            />

                          </div>
                        )}

                        {item.audio && (
                          <div className="message-bubble">

                            <audio
                              controls
                              src={
                                item.audio
                              }
                            />

                          </div>
                        )}

                        {item.message && (
                          <div className="message-bubble">
                            {
                              item.message
                            }
                          </div>
                        )}

                        <small>
                          {item.time}
                        </small>

                      </div>

                    </div>
                  );
                }
              )}

          {chatMode ===
            "public" &&
            publicMessages.map(
              (item, index) => {

                const isMine =
                  item.username ===
                  username;

                /*
                  Public chat mein bhi sender ki
                  actual profile picture.
                */
                const messageAvatar =
                  isMine
                    ? (
                        item.profileImage ||
                        profileImage ||
                        ""
                      )
                    : (
                        item.profileImage ||
                        item.senderProfileImage ||
                        item.avatar ||
                        chatProfileImages[item.username] ||
                        ""
                      );

                return (
                  <div
                    key={
                      item._id
                        ? String(
                            item._id
                          )
                        : `${item.username}-${item.time}-${index}`
                    }
                    className={
                      isMine
                        ? "message-row my-message-row"
                        : "message-row"
                    }
                  >

                    <div
                      className="message-avatar"
                      onClick={() => {
                        if (!isMine) {
                          openUserProfile(
                            item.username
                          );
                        }
                      }}
                      style={{
                        cursor: isMine
                          ? "default"
                          : "pointer"
                      }}
                    >

                      {messageAvatar ? (
                        <img
                          src={messageAvatar}
                          alt={
                            item.username +
                            " Profile"
                          }
                        />
                      ) : (
                        "\u{1F464}"
                      )}

                    </div>

                    <div className="message-details">

                      <strong
                        onClick={() => {
                          if (!isMine) {
                            openUserProfile(
                              item.username
                            );
                          }
                        }}
                        style={{
                          cursor: isMine
                            ? "default"
                            : "pointer"
                        }}
                      >
                        {
                          item.username
                        }
                      </strong>

                      {item.message && (
                        <div
                          className={
                            "message-bubble " +
                            (!isMine
                              ? "public-message-clickable"
                              : "")
                          }
                          onClick={() => {
                            if (
                              !isMine
                            ) {
                              handlePublicMessageClick(
                                item
                              );
                            }
                          }}
                          title={
                            !isMine
                              ? "Click to report this message"
                              : ""
                          }
                        >
                          {
                            item.message
                          }
                        </div>
                      )}

                      {!isMine && (
                        <small className="report-hint">
                          Click message to report
                        </small>
                      )}

                      <small>
                        {item.time}
                      </small>

                    </div>

                  </div>
                );
              }
            )}

        </div>

        {showEmoji && (
          <div className="emoji-box">

            {emojis.map(
              (emoji, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    addEmoji(
                      emoji
                    )
                  }
                >
                  {emoji}
                </button>
              )
            )}

          </div>
        )}

        <div className="input-area">

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={
              handleImage
            }
            style={{
              display: "none"
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowEmoji(
                !showEmoji
              )
            }
            disabled={
              chatMode ===
                "private" &&
              !selectedUser
            }
          >
            {"\u{1F600}"}
          </button>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current.click()
            }
            disabled={
              chatMode === "public" ||
              (chatMode === "private" &&
                !selectedUser)
            }
          >
            {"\u{1F4F7}"}
          </button>

          <button
            type="button"
            onClick={
              handleVoiceButton
            }
            disabled={
              chatMode ===
                "private" &&
              !selectedUser
            }
          >
            {isRecording
              ? "\u{23F9}\uFE0F"
              : "\u{1F3A4}"}
          </button>

          <input
            type="text"
            value={message}
            placeholder={
              chatMode ===
              "public"
                ? "Public Chat mein message likhein..."
                : selectedUser
                ? "Message " +
                  selectedUser +
                  "..."
                : "Select a user first..."
            }
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            onKeyDown={
              handleEnter
            }
            disabled={
              chatMode ===
                "private" &&
              !selectedUser
            }
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={
              !message.trim() ||
              (chatMode === "private" && !selectedUser)
            }
            style={{
              width: "42px",
              height: "42px",
              minWidth: "42px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: "#1877F2",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              marginLeft: "6px"
            }}
          >
            <span
              style={{
                position: "relative",
                display: "block",
                width: "18px",
                height: "16px",
                transform: "rotate(-8deg)"
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: "1px",
                  left: "1px",
                  width: "0",
                  height: "0",
                  borderTop: "7px solid transparent",
                  borderBottom: "7px solid transparent",
                  borderLeft: "17px solid white"
                }}
              />

              <span
                style={{
                  position: "absolute",
                  top: "6px",
                  left: "3px",
                  width: "11px",
                  height: "2px",
                  backgroundColor: "#1877F2",
                  transform: "rotate(-18deg)"
                }}
              />
            </span>
          </button>

        </div>

      </div>

      {/* ======================================
          COMMUNITY RULES
      ====================================== */}

      <aside className="community-side-panel">

        <div className="community-side-title">
          {"\u{1F4DC} Community Rules"}
        </div>

        <div className="community-rule-box">

          <div className="rule-number">
            1
          </div>

          <div>
            <strong>
              Respect Everyone
            </strong>

            <p>
              Har member ke saath
              respect se baat karein.
            </p>
          </div>

        </div>

        <div className="community-rule-box">

          <div className="rule-number">
            2
          </div>

          <div>
            <strong>
              No Scam or Fraud
            </strong>

            <p>
              Fraud, scam ya
              misleading offers
              allowed nahi hain.
            </p>
          </div>

        </div>

        <div className="community-rule-box">

          <div className="rule-number">
            3
          </div>

          <div>
            <strong>
              No Spam
            </strong>

            <p>
              Unnecessary spam aur
              repeated advertising
              se parhez karein.
            </p>
          </div>

        </div>

        <div className="community-rule-box">

          <div className="rule-number">
            4
          </div>

          <div>
            <strong>
              Genuine Products
            </strong>

            <p>
              Sirf genuine products
              aur services promote
              karein.
            </p>
          </div>

        </div>

        <div className="sell-here-box">

          <div className="sell-here-icon">
            {"\u{1F6CD}\uFE0F"}
          </div>

          <div className="sell-here-title">
            Sell Your Products Here
          </div>

          <button
            type="button"
            onClick={() => {
              setShowProductForm(
                true
              );
              setProductSubmitted(
                false
              );
              setApprovalStatus("");
            }}
            style={{
              marginTop: "10px",
              padding: "9px 14px",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {"\u{1F6CD}\uFE0F Sell Your Product"}
          </button>

          <p>
            Apni products aur
            services yahan showcase
            karein aur duniya bhar
            se customers hasil
            karein.
          </p>

          <div className="sell-here-line">
            {"\u{1F680} Promote \u2022 Connect \u2022 Sell \u2022 Grow"}
          </div>

        </div>

      </aside>

      {/* ======================================
          PRODUCT FORM
      ====================================== */}

      {showProductForm && (
        <div
          style={{
            marginTop: "12px",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "#fff"
          }}
        >

          <h3
            style={{
              marginTop: 0
            }}
          >
            {"\u{1F6CD}\uFE0F Sell Your Product"}
          </h3>

          {approvalStatus ===
            "pending" && (
            <div
              style={{
                padding: "12px",
                marginBottom: "12px",
                borderRadius: "8px",
                background:
                  "#fff3cd",
                border:
                  "1px solid #ffc107",
                color:
                  "#856404"
              }}
            >
              <strong>
                {"\u23F3 Approval Needed"}
              </strong>

              <div
                style={{
                  marginTop:
                    "5px",
                  fontSize:
                    "13px"
                }}
              >
                Aapki product
                successfully submit
                ho gayi hai.
                <br />
                Admin{" "}
                <strong>
                  Armani
                </strong>{" "}
                approval ke baad
                promotion public
                Featured Promotions
                mein show hogi.
              </div>
            </div>
          )}

          {approvalStatus ===
            "approved" && (
            <div
              style={{
                padding: "12px",
                marginBottom: "12px",
                borderRadius: "8px",
                background:
                  "#d4edda",
                border:
                  "1px solid #28a745",
                color:
                  "#155724"
              }}
            >
              <strong>
                {"\u2705 Approved"}
              </strong>

              <div
                style={{
                  marginTop:
                    "5px",
                  fontSize:
                    "13px"
                }}
              >
                Mubarak ho! {"\u{1F389}"}
                Aapki product
                Admin ne approve kar
                di hai aur ab Featured
                Promotions mein show
                ho rahi hai.
              </div>
            </div>
          )}

          {!productSubmitted && (
            <>
              <input
                type="text"
                placeholder="Product name"
                value={
                  productTitle
                }
                onChange={(e) =>
                  setProductTitle(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  marginBottom:
                    "8px",
                  padding: "8px",
                  boxSizing:
                    "border-box"
                }}
              />

              <input
                type="text"
                placeholder="Price"
                value={
                  productPrice
                }
                onChange={(e) =>
                  setProductPrice(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  marginBottom:
                    "8px",
                  padding: "8px",
                  boxSizing:
                    "border-box"
                }}
              />

              <textarea
                placeholder="Product description"
                value={
                  productDescription
                }
                onChange={(e) =>
                  setProductDescription(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  minHeight:
                    "70px",
                  marginBottom:
                    "8px",
                  padding: "8px",
                  boxSizing:
                    "border-box"
                }}
              />

              <input
                type="text"
                placeholder="Product link (optional)"
                value={
                  productLink
                }
                onChange={(e) =>
                  setProductLink(
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  marginBottom:
                    "8px",
                  padding: "8px",
                  boxSizing:
                    "border-box"
                }}
              />

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleProductImage
                }
                style={{
                  width: "100%",
                  marginBottom:
                    "8px"
                }}
              />

              {productImage && (
                <img
                  src={
                    productImage
                  }
                  alt="Product preview"
                  style={{
                    width: "120px",
                    height: "120px",
                    objectFit:
                      "cover",
                    borderRadius:
                      "8px",
                    display:
                      "block",
                    marginBottom:
                      "10px"
                  }}
                />
              )}

              <div
                style={{
                  display:
                    "flex",
                  gap: "8px"
                }}
              >

                <button
                  type="button"
                  onClick={
                    submitProductForApproval
                  }
                >
                  {"\u{1F4E4} Submit for Approval"}
                </button>

                <button
                  type="button"
                  onClick={
                    closeProductForm
                  }
                >
                  Cancel
                </button>

              </div>
            </>
          )}

          {productSubmitted &&
            approvalStatus ===
              "pending" && (
              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "10px"
                }}
              >
                <div
                  style={{
                    fontSize:
                      "32px"
                  }}
                >
                  {"\u23F3"}
                </div>

                <strong>
                  Waiting for Admin Approval
                </strong>

                <p
                  style={{
                    fontSize:
                      "13px",
                    color:
                      "#666"
                  }}
                >
                  Aapki product request
                  Admin Armani ko bhej
                  di gayi hai.
                </p>

                <button
                  type="button"
                  onClick={
                    closeProductForm
                  }
                >
                  Close
                </button>
              </div>
            )}

          {approvalStatus ===
            "approved" && (
            <div
              style={{
                textAlign:
                  "center",
                marginTop:
                  "10px"
              }}
            >
              <button
                type="button"
                onClick={
                  closeProductForm
                }
              >
                Close
              </button>
            </div>
          )}

        </div>
      )}

      {/* ======================================
          FEATURED PROMOTIONS
      ====================================== */}

      <aside className="promotion-panel">

        <div className="promotion-header">
          {"\u2B50"} Featured Promotions
        </div>

        {promotions.length > 0 ? (

          <div className="promotion-list">

            {promotions.map(
              (promotion, index) => (

                <div
                  className="promotion-card"
                  key={
                    promotion._id
                      ? String(
                          promotion._id
                        )
                      : index
                  }
                >

                  {promotion.image ? (

                    <div className="promotion-image-wrapper">

                      <img
                        src={
                          promotion.image
                        }
                        alt={
                          promotion.title ||
                          "Promotion"
                        }
                        className="promotion-image-real"
                      />

                    </div>

                  ) : (

                    <div className="promotion-image">
                      {"\u{1F5BC}"}
                    </div>

                  )}

                  <h3>
                    {promotion.title ||
                      "Promotion"}
                  </h3>

                  {promotion.promotionTitle && (
                    <p className="promotion-title">
                      {
                        promotion.promotionTitle
                      }
                    </p>
                  )}

                  <p className="promotion-text">
                    {promotion.description ||
                      "No promotion description."}
                  </p>

                  {promotion.link && (
                    <button
                      type="button"
                      className="promotion-button"
                      onClick={() =>
                        handlePromotionClick(
                          promotion
                        )
                      }
                    >
                      Learn More
                    </button>
                  )}

                </div>

              )
            )}

          </div>

        ) : (

          <div
            className="promotion-card"
            style={{
              textAlign:
                "center"
            }}
          >

            <div className="promotion-image">
              {"\u{1F5BC}"}
            </div>

            <h3>
              No Active Promotion
            </h3>

            <p className="promotion-text">
              Abhi koi active
              promotion available
              nahi hai.
            </p>

          </div>

        )}

      </aside>

      {/* ======================================
          PROFILE VIEWER
      ====================================== */}

      {showProfileViewer && (
        <div
          style={{
            position: "fixed",
            inset: "0",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px"
          }}
          onClick={closeUserProfile}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "390px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: "18px",
              padding: "22px",
              boxSizing: "border-box",
              boxShadow: "0 10px 35px rgba(0,0,0,0.25)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px"
              }}
            >
              <h2 style={{ margin: "0", color: "#333" }}>
                User Profile
              </h2>

              <button
                type="button"
                onClick={closeUserProfile}
                style={{
                  border: "none",
                  background: "#f1f1f1",
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  fontSize: "20px",
                  cursor: "pointer"
                }}
              >
                {"\u{1F519}"}
              </button>
            </div>

            {profileLoading && (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px",
                  color: "#777"
                }}
              >
                Loading profile...
              </div>
            )}

            {!profileLoading && profileError && (
              <div
                style={{
                  textAlign: "center",
                  padding: "25px",
                  color: "#d33"
                }}
              >
                {profileError}
              </div>
            )}

            {!profileLoading &&
              !profileError &&
              viewedProfile && (
                <div>
                  <div
                    style={{
                      textAlign: "center",
                      marginBottom: "20px"
                    }}
                  >
                    {viewedProfile.profileImage ? (
                      <img
                        src={viewedProfile.profileImage}
                        alt="Profile"
                        style={{
                          width: "105px",
                          height: "105px",
                          borderRadius: "50%",
                          objectFit: "cover",
                          border: "3px solid #eee"
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "105px",
                          height: "105px",
                          borderRadius: "50%",
                          background: "#f1f1f1",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "48px"
                        }}
                      >
                        {"\u{1F464}"}
                      </div>
                    )}

                    <h3
                      style={{
                        margin: "12px 0 0",
                        color: "#333"
                      }}
                    >
                      {viewedProfile.username}
                    </h3>
                  </div>

                  <div
                    style={{
                      background: "#f8f9fb",
                      borderRadius: "12px",
                      padding: "13px",
                      marginBottom: "12px"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginBottom: "5px"
                      }}
                    >
                      EMAIL
                    </div>

                    <div>
                      {viewedProfile.email || "Not available"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#f8f9fb",
                      borderRadius: "12px",
                      padding: "13px",
                      marginBottom: "12px"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginBottom: "5px"
                      }}
                    >
                      BIO
                    </div>

                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {viewedProfile.bio || "No bio available."}
                    </div>
                  </div>

                  {viewedProfile.videoStatus && (
                    <div
                      style={{
                        background: "#f8f9fb",
                        borderRadius: "12px",
                        padding: "13px"
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#888",
                          marginBottom: "8px"
                        }}
                      >
                        VIDEO STATUS
                      </div>

                      <video
                        src={viewedProfile.videoStatus}
                        controls
                        playsInline
                        style={{
                          width: "100%",
                          maxHeight: "280px",
                          borderRadius: "10px",
                          display: "block",
                          background: "#000"
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chat;













