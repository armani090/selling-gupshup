import React, { useEffect, useState, useCallback } from "react";
import { socket } from "../socket";
import "./Admin.css";

function Admin() {
  const adminUsername =
    localStorage.getItem("username") || "";

  const normalizedUsername =
    adminUsername.toLowerCase();

  const isMainAdmin =
    normalizedUsername === "armani";

  const savedRole =
    (localStorage.getItem("role") || "user").toLowerCase();

  const isAdmin =
    isMainAdmin ||
    savedRole === "admin" ||
    savedRole === "moderator";

  const displayRole = isMainAdmin
    ? "Main Admin"
    : savedRole === "admin"
    ? "Admin"
    : savedRole === "moderator"
    ? "Moderator"
    : "User";

  const [reports, setReports] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [pendingPromotions, setPendingPromotions] =
    useState([]);

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUser, setUpdatingUser] = useState("");
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingPromotions, setLoadingPromotions] =
    useState(true);
  const [loadingPending, setLoadingPending] =
    useState(true);

  const [showPromotionForm, setShowPromotionForm] =
    useState(false);

  const [promotionTitle, setPromotionTitle] =
    useState("");

  const [promotionDescription, setPromotionDescription] =
    useState("");

  const [promotionLink, setPromotionLink] =
    useState("");

  const [promotionImage, setPromotionImage] =
    useState("");

  const [promotionActive, setPromotionActive] =
    useState(true);

  // ==========================================
  // REQUEST ADMIN DATA
  // ==========================================

  const requestAdminData = useCallback(() => {
    if (!isAdmin) {
      return;
    }

    if (!socket.connected) {
      console.log(
        "ADMIN DATA REQUEST WAITING - SOCKET NOT CONNECTED"
      );
      return;
    }

    console.log("====================================");
    console.log("REQUESTING ADMIN DATA...");
    console.log("SOCKET ID:", socket.id);
    console.log("ADMIN:", adminUsername);
    console.log("ROLE:", displayRole);

    socket.emit("get_admin_reports");

    socket.emit("get_admin_posts", {
      admin: adminUsername
    });

    socket.emit("get_admin_users", {
      admin: adminUsername
    });

    console.log("ADMIN USERS REQUEST SENT");
    console.log("ADMIN REPORT REQUEST SENT");

    socket.emit("get_admin_promotions", {
      admin: adminUsername
    });

    console.log("ADMIN PROMOTIONS REQUEST SENT");

    socket.emit("get_pending_promotions", {
      admin: adminUsername
    });

    console.log(
      "PENDING PROMOTIONS REQUEST SENT"
    );

    console.log("====================================");
  }, [
    isAdmin,
    adminUsername,
    displayRole
  ]);

  // ==========================================
  // REQUEST AFTER CONNECTION
  // ==========================================

  const requestAfterConnection =
    useCallback(() => {
      setTimeout(() => {
        console.log(
          "NOW REQUESTING ADMIN DATA..."
        );

        requestAdminData();
      }, 500);
    }, [requestAdminData]);

  // ==========================================
  // ADMIN SOCKET SETUP
  // ==========================================

  useEffect(() => {
    if (!isAdmin) {
      setLoadingReports(false);
      setLoadingPromotions(false);
      setLoadingPending(false);
      setLoadingUsers(false);

      return undefined;
    }

    console.log("====================================");
    console.log(
      "ADMIN PAGE LOADED:",
      adminUsername
    );
    console.log(
      "ROLE:",
      displayRole
    );
    console.log(
      "IS ADMIN:",
      isAdmin
    );
    console.log(
      "IS MAIN ADMIN:",
      isMainAdmin
    );
    console.log(
      "SOCKET CONNECTED:",
      socket.connected
    );
    console.log(
      "SOCKET ID:",
      socket.id
    );
    console.log("====================================");

    // ========================================
    // CONNECT
    // ========================================

    const handleConnect = () => {
      console.log("====================================");
      console.log(
        "ADMIN SOCKET CONNECTED:",
        socket.id
      );

      socket.emit("join_chat", {
        username: adminUsername
      });

      console.log(
        "ADMIN JOIN_CHAT SENT:",
        adminUsername
      );

      requestAfterConnection();

      console.log("====================================");
    };

    // ========================================
    // REPORTS
    // ========================================

    const handleReports = (data) => {
      console.log(
        "ADMIN REPORTS RECEIVED:",
        data
      );

      setReports(
        Array.isArray(data)
          ? data
          : []
      );

      setLoadingReports(false);
    };

    // ========================================
    // ADMIN POSTS
    // ========================================

    const handleAdminPosts = (data) => {
      console.log(
        "ADMIN POSTS RECEIVED:",
        data
      );

      setAdminPosts(
        Array.isArray(data)
          ? data
          : []
      );
    };

    // ========================================
    // USERS
    // ========================================

    const handleUsers = (data) => {
      console.log(
        "ADMIN USERS RECEIVED:",
        data
      );

      setUsers(
        Array.isArray(data)
          ? data
          : []
      );

      setLoadingUsers(false);
    };

    // ========================================
    // ALL PROMOTIONS
    // ========================================

    const handleAdminPromotions = (data) => {
      console.log(
        "ADMIN PROMOTIONS RECEIVED:",
        data
      );

      setPromotions(
        Array.isArray(data)
          ? data
          : []
      );

      setLoadingPromotions(false);
    };

    // ========================================
    // PENDING PROMOTIONS
    // ========================================

    const handlePendingPromotions = (data) => {
      console.log(
        "PENDING PROMOTIONS RECEIVED:",
        data
      );

      setPendingPromotions(
        Array.isArray(data)
          ? data
          : []
      );

      setLoadingPending(false);
    };

    // ========================================
    // NEW PUBLIC PROMOTION
    // ========================================

    const handleNewPromotionForAdmin =
      (data) => {
        console.log(
          "NEW PUBLIC PROMOTION RECEIVED:",
          data
        );

        if (!data) {
          return;
        }

        setPendingPromotions(
          (oldPromotions) => {
            const exists =
              oldPromotions.some(
                (item) =>
                  String(item._id) ===
                  String(data._id)
              );

            if (exists) {
              return oldPromotions.map(
                (item) =>
                  String(item._id) ===
                  String(data._id)
                    ? data
                    : item
              );
            }

            return [
              data,
              ...oldPromotions
            ];
          }
        );

        setLoadingPending(false);
      };

    // ========================================
    // PROMOTION CREATED
    // ========================================

    const handlePromotionCreated =
      (data) => {
        console.log(
          "PROMOTION CREATED:",
          data
        );

        if (!data) {
          return;
        }

        if (
          data.status === "pending" ||
          data.approved === false ||
          data.active === false
        ) {
          setPendingPromotions(
            (oldPromotions) => {
              const exists =
                oldPromotions.some(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                );

              if (exists) {
                return oldPromotions.map(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                      ? data
                      : item
                );
              }

              return [
                data,
                ...oldPromotions
              ];
            }
          );

          setLoadingPending(false);
          return;
        }

        if (
          data.approved === true &&
          data.active === true
        ) {
          setPromotions(
            (oldPromotions) => {
              const exists =
                oldPromotions.some(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                );

              if (exists) {
                return oldPromotions.map(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                      ? data
                      : item
                );
              }

              return [
                data,
                ...oldPromotions
              ];
            }
          );

          setPendingPromotions(
            (oldPromotions) =>
              oldPromotions.filter(
                (item) =>
                  String(item._id) !==
                  String(data._id)
              )
          );
        }
      };

    // ========================================
    // PROMOTION UPDATED
    // ========================================

    const handlePromotionUpdated =
      (data) => {
        console.log(
          "PROMOTION UPDATED:",
          data
        );

        if (!data) {
          return;
        }

        if (
          data.status === "pending" ||
          data.approved === false ||
          data.active === false
        ) {
          setPendingPromotions(
            (oldPromotions) => {
              const exists =
                oldPromotions.some(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                );

              if (exists) {
                return oldPromotions.map(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                      ? data
                      : item
                );
              }

              return [
                data,
                ...oldPromotions
              ];
            }
          );

          setLoadingPending(false);

          return;
        }

        if (
          data.approved === true &&
          data.active === true
        ) {
          setPromotions(
            (oldPromotions) => {
              const exists =
                oldPromotions.some(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                );

              if (exists) {
                return oldPromotions.map(
                  (item) =>
                    String(item._id) ===
                    String(data._id)
                      ? data
                      : item
                );
              }

              return [
                data,
                ...oldPromotions
              ];
            }
          );

          setPendingPromotions(
            (oldPromotions) =>
              oldPromotions.filter(
                (item) =>
                  String(item._id) !==
                  String(data._id)
              )
          );
        }
      };

    // ========================================
    // PROMOTION APPROVED
    // ========================================

    const handlePromotionApproved =
      (data) => {
        console.log(
          "PROMOTION APPROVED:",
          data
        );

        if (!data) {
          return;
        }

        setPendingPromotions(
          (oldPromotions) =>
            oldPromotions.filter(
              (item) =>
                String(item._id) !==
                String(data._id)
            )
        );

        setPromotions(
          (oldPromotions) => {
            const exists =
              oldPromotions.some(
                (item) =>
                  String(item._id) ===
                  String(data._id)
              );

            if (exists) {
              return oldPromotions.map(
                (item) =>
                  String(item._id) ===
                  String(data._id)
                    ? data
                    : item
              );
            }

            return [
              data,
              ...oldPromotions
            ];
          }
        );

        setTimeout(() => {
          requestAdminData();
        }, 300);
      };

    // ========================================
    // PROMOTION REJECTED
    // ========================================

    const handlePromotionRejected =
      (data) => {
        console.log(
          "PROMOTION REJECTED:",
          data
        );

        if (
          !data ||
          !data.deletedId
        ) {
          return;
        }

        setPendingPromotions(
          (oldPromotions) =>
            oldPromotions.filter(
              (item) =>
                String(item._id) !==
                String(data.deletedId)
            )
        );

        setTimeout(() => {
          requestAdminData();
        }, 300);
      };

    // ========================================
    // PROMOTION DELETED
    // ========================================

    const handlePromotionDeleted =
      (data) => {
        console.log(
          "PROMOTION DELETED:",
          data
        );

        if (
          !data ||
          !data.deletedId
        ) {
          return;
        }

        setPromotions(
          (oldPromotions) =>
            oldPromotions.filter(
              (item) =>
                String(item._id) !==
                String(data.deletedId)
            )
        );

        setPendingPromotions(
          (oldPromotions) =>
            oldPromotions.filter(
              (item) =>
                String(item._id) !==
                String(data.deletedId)
            )
        );
      };

    // ========================================
    // LISTENERS
    // ========================================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "admin_reports_data",
      handleReports
    );

    socket.on(
      "admin_posts_data",
      handleAdminPosts
    );

    socket.on(
      "admin_users_data",
      handleUsers
    );

    socket.on(
      "admin_promotions_data",
      handleAdminPromotions
    );

    socket.on(
      "pending_promotions_data",
      handlePendingPromotions
    );

    socket.on(
      "new_promotion_for_admin",
      handleNewPromotionForAdmin
    );

    socket.on(
      "promotion_created",
      handlePromotionCreated
    );

    socket.on(
      "promotion_updated",
      handlePromotionUpdated
    );

    socket.on(
      "promotion_approved",
      handlePromotionApproved
    );

    socket.on(
      "promotion_rejected",
      handlePromotionRejected
    );

    socket.on(
      "promotion_deleted",
      handlePromotionDeleted
    );

    // ========================================
    // ALREADY CONNECTED
    // ========================================

    if (socket.connected) {
      console.log(
        "ADMIN SOCKET ALREADY CONNECTED:",
        socket.id
      );

      socket.emit(
        "join_chat",
        {
          username: adminUsername
        }
      );

      console.log(
        "ADMIN JOIN_CHAT SENT:",
        adminUsername
      );

      requestAfterConnection();
    }

    // ========================================
    // CLEANUP
    // ========================================

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "admin_users_data",
        handleUsers
      );

      socket.off(
        "admin_reports_data",
        handleReports
      );

      socket.off(
        "admin_posts_data",
        handleAdminPosts
      );

      socket.off(
        "admin_promotions_data",
        handleAdminPromotions
      );

      socket.off(
        "pending_promotions_data",
        handlePendingPromotions
      );

      socket.off(
        "new_promotion_for_admin",
        handleNewPromotionForAdmin
      );

      socket.off(
        "promotion_created",
        handlePromotionCreated
      );

      socket.off(
        "promotion_updated",
        handlePromotionUpdated
      );

      socket.off(
        "promotion_approved",
        handlePromotionApproved
      );

      socket.off(
        "promotion_rejected",
        handlePromotionRejected
      );

      socket.off(
        "promotion_deleted",
        handlePromotionDeleted
      );
    };
  }, [
    isAdmin,
    isMainAdmin,
    adminUsername,
    displayRole,
    requestAdminData,
    requestAfterConnection
  ]);

  // ==========================================
  // DELETE REPORT
  // ==========================================

  const deleteReport = (reportId) => {
    if (!reportId) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Kya aap ye report delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    socket.emit(
      "delete_admin_report",
      {
        reportId,
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // ADMIN DELETE POST
  // ==========================================

  const deleteAdminPost = (postId) => {
    if (!postId) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Kya aap ye post permanently delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    socket.emit(
      "admin_delete_post",
      {
        postId: String(postId),
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // ADMIN DELETE COMMENT
  // ==========================================

  const deleteAdminComment = (
    postId,
    commentId
  ) => {
    if (!postId || !commentId) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Kya aap ye comment permanently delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    socket.emit(
      "admin_delete_post_comment",
      {
        postId: String(postId),
        commentId: String(commentId),
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // REFRESH REPORTS
  // ==========================================

  const refreshReports = () => {
    setLoadingReports(true);

    if (!socket.connected) {
      setLoadingReports(false);
      socket.connect();
      return;
    }

    socket.emit(
      "get_admin_reports"
    );
  };

  // ==========================================
  // REFRESH PROMOTIONS
  // ==========================================

  const refreshPromotions = () => {
    setLoadingPromotions(true);

    if (!socket.connected) {
      setLoadingPromotions(false);
      socket.connect();
      return;
    }

    socket.emit(
      "get_admin_promotions",
      {
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // REFRESH PENDING PROMOTIONS
  // ==========================================

  const refreshPendingPromotions = () => {
    setLoadingPending(true);

    console.log(
      "REQUESTING PENDING PROMOTIONS..."
    );

    if (!socket.connected) {
      console.log(
        "PENDING REQUEST WAITING FOR SOCKET..."
      );

      socket.connect();

      setTimeout(() => {
        if (socket.connected) {
          socket.emit(
            "get_pending_promotions",
            {
              admin: adminUsername
            }
          );
        }
      }, 700);

      return;
    }

    socket.emit(
      "get_pending_promotions",
      {
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // APPROVE PROMOTION
  // ==========================================

  const approvePromotion = (
    promotionId
  ) => {
    if (!promotionId) {
      return;
    }

    const confirmApprove =
      window.confirm(
        "Kya aap is promotion ko APPROVE karna chahte hain?"
      );

    if (!confirmApprove) {
      return;
    }

    console.log(
      "APPROVING PROMOTION:",
      promotionId,
      "BY:",
      adminUsername,
      "ROLE:",
      displayRole
    );

    socket.emit(
      "approve_promotion",
      {
        promotionId,
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // REJECT PROMOTION
  // ==========================================

  const rejectPromotion = (
    promotionId
  ) => {
    if (!promotionId) {
      return;
    }

    const confirmReject =
      window.confirm(
        "Kya aap is promotion ko REJECT karna chahte hain?"
      );

    if (!confirmReject) {
      return;
    }

    console.log(
      "REJECTING PROMOTION:",
      promotionId,
      "BY:",
      adminUsername,
      "ROLE:",
      displayRole
    );

    socket.emit(
      "reject_promotion",
      {
        promotionId,
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // IMAGE SELECT
  // ==========================================

  const handlePromotionImage = (
    event
  ) => {
    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      alert(
        "Sirf image file select karein."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      alert(
        "Image 2 MB se choti honi chahiye."
      );

      event.target.value = "";

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setPromotionImage(
        reader.result
      );
    };

    reader.onerror = () => {
      alert(
        "Image load nahi ho saki."
      );
    };

    reader.readAsDataURL(file);
  };

  // ==========================================
  // CREATE ADMIN PROMOTION
  // ==========================================

  const createPromotion = () => {
    const title =
      promotionTitle.trim();

    const description =
      promotionDescription.trim();

    const link =
      promotionLink.trim();

    if (!title) {
      alert(
        "Promotion ka title likhein."
      );

      return;
    }

    if (!description) {
      alert(
        "Promotion ka message likhein."
      );

      return;
    }

    if (!socket.connected) {
      alert(
        "Server se connection nahi hai. Thori der baad dobara try karein."
      );

      return;
    }

    socket.emit(
      "create_promotion",
      {
        username:
          adminUsername,

        title,

        description,

        link,

        image:
          promotionImage,

        active:
          promotionActive,

        promotionTitle:
          ""
      }
    );

    setShowPromotionForm(false);
    setPromotionTitle("");
    setPromotionDescription("");
    setPromotionLink("");
    setPromotionImage("");
    setPromotionActive(true);
  };

  // ==========================================
  // DELETE PROMOTION
  // ==========================================

  const deletePromotion = (
    promotionId
  ) => {
    if (!promotionId) {
      return;
    }

    const confirmDelete =
      window.confirm(
        "Kya aap ye promotion delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    console.log(
      "DELETING PROMOTION:",
      promotionId,
      "BY:",
      adminUsername
    );

    socket.emit(
      "delete_promotion",
      {
        promotionId,
        admin: adminUsername
      }
    );
  };

  // ==========================================
  // TOGGLE PROMOTION
  // ==========================================

  const togglePromotion = (
    promotion
  ) => {
    if (!promotion) {
      return;
    }

    console.log(
      "TOGGLING PROMOTION:",
      promotion._id,
      "BY:",
      adminUsername
    );

    socket.emit(
      "update_promotion",
      {
        promotionId:
          promotion._id,

        title:
          promotion.title,

        description:
          promotion.description,

        active:
          !promotion.active,

        admin:
          adminUsername
      }
    );
  };

  // ==========================================
  // NOT ADMIN
  // ==========================================

  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-denied">

          <div className="admin-denied-icon">
          </div>

          <h1>
            Access Denied
          </h1>

          <p>
            Sirf Admin ya Moderator
            Admin Panel access kar
            sakta hai.
          </p>

        </div>
      </div>
    );
  }

  // ==========================================
  // ADMIN PANEL
  // ==========================================

  return (
    <div className="admin-page">

      <div className="admin-container">

        {/* HEADER */}

        <div className="admin-header">

          <div>
            <h1>
              Selling GupShup Admin Panel
            </h1>

            <p>
              Welcome,{" "}
              <strong>
                {adminUsername || "Admin"}
              </strong>
            </p>

            <p
              style={{
                marginTop: "3px",
                fontSize: "11px",
                color: "#64748b"
              }}
            >
              Role:{" "}
              <strong>
                {displayRole}
              </strong>
            </p>
          </div>

          <div className="admin-badge">
            {displayRole.toUpperCase()}
          </div>
        </div>

        {/* STATS */}

        <div className="admin-stats">

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
            </div>

            <div>
              <span>
                Total Reports
              </span>

              <strong>
                {reports.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
            </div>

            <div>
              <span>
                Pending Promotions
              </span>

              <strong>
                {pendingPromotions.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
            </div>

            <div>
              <span>
                Promotions
              </span>

              <strong>
                {promotions.length}
              </strong>
            </div>

          </div>

          <div className="admin-stat-card">

            <div className="admin-stat-icon">
            </div>

            <div>
              <span>
                Current Role
              </span>

              <strong>
                {displayRole}
              </strong>
            </div>

          </div>

        </div>

        {/* ======================================
            USER MANAGEMENT
        ====================================== */}

        <div className="admin-section">

          <div className="admin-section-header">

            <div>
              <h2>
                User Management
              </h2>

              <p>
                Registered users ko manage karein.
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => {
                setLoadingUsers(true);

                socket.emit(
                  "get_admin_users",
                  {
                    admin:
                      adminUsername
                  }
                );
              }}
            >
              Refresh Users
            </button>

          </div>

          {loadingUsers ? (

            <div className="admin-loading">
              Users loading...
            </div>

          ) : users.length === 0 ? (

            <div className="admin-empty">
              <p>
                No registered users found.
              </p>
            </div>

          ) : (

            <div className="user-management-list">

              {users.map(
                (user, index) => {

                  const username =
                    user.username ||
                    "Unknown User";

                  const normalizedUser =
                    username.toLowerCase();

                  const suspended =
                    user.suspended === true;

                  const blocked =
                    user.blocked === true;

                  const userRole =
                    normalizedUser ===
                    "armani"
                      ? "main_admin"
                      : (
                          user.role ||
                          "user"
                        ).toLowerCase();

                  const isTargetMainAdmin =
                    normalizedUser ===
                    "armani";

                  const isTargetStaff =
                    userRole === "admin" ||
                    userRole === "moderator" ||
                    userRole === "main_admin";

                  const canManageRole =
                    isMainAdmin &&
                    !isTargetMainAdmin;

                  const canManageUser =
                    !isTargetMainAdmin &&
                    (
                      isMainAdmin ||
                      !isTargetStaff
                    );

                  return (
                    <div
                      className="user-management-card"
                      key={
                        user._id
                          ? String(
                              user._id
                            )
                          : index
                      }
                    >

                      <span className="user-management-name">

                        {username}

                        {userRole ===
                          "main_admin" && (
                          <small
                            style={{
                              marginLeft:
                                "8px"
                            }}
                          >
                            Main Admin
                          </small>
                        )}

                        {userRole ===
                          "admin" && (
                          <small
                            style={{
                              marginLeft:
                                "8px"
                            }}
                          >
                            Admin
                          </small>
                        )}

                        {userRole ===
                          "moderator" && (
                          <small
                            style={{
                              marginLeft:
                                "8px"
                            }}
                          >
                            Moderator
                          </small>
                        )}

                      </span>

                      <span
                        className={
                          "user-status " +
                          (
                            blocked
                              ? "user-status-blocked"
                              : suspended
                              ? "user-status-suspended"
                              : "user-status-active"
                          )
                        }
                      >
                        {
                          blocked
                            ? "Blocked"
                            : suspended
                            ? "Suspended"
                            : "Active"
                        }
                      </span>

                      {!isTargetMainAdmin && (
                        <div
                          style={{
                            display:
                              "flex",
                            gap:
                              "7px",
                            marginTop:
                              "8px",
                            flexWrap:
                              "wrap"
                          }}
                        >

                          {canManageUser && (
                            <>
                              <button
                                type="button"
                                className="user-action-button user-suspend-button"
                                disabled={
                                  updatingUser ===
                                  username
                                }
                                onClick={() => {
                                  console.log(
                                    "SUSPEND BUTTON CLICKED:",
                                    username
                                  );

                                  setUpdatingUser(
                                    username
                                  );

                                  socket.emit(
                                    "update_user_management",
                                    {
                                      admin:
                                        adminUsername,
                                      username:
                                        username,
                                      action:
                                        suspended
                                          ? "unsuspend"
                                          : "suspend"
                                    }
                                  );

                                  setTimeout(
                                    () => {
                                      setUpdatingUser(
                                        ""
                                      );

                                      socket.emit(
                                        "get_admin_users",
                                        {
                                          admin:
                                            adminUsername
                                        }
                                      );
                                    },
                                    500
                                  );
                                }}
                              >
                                {
                                  suspended
                                    ? "Unsuspend"
                                    : "Suspend"
                                }
                              </button>

                              <button
                                type="button"
                                className="user-action-button user-block-button"
                                disabled={
                                  updatingUser ===
                                  username
                                }
                                onClick={() => {
                                  console.log(
                                    "BLOCK BUTTON CLICKED:",
                                    username
                                  );

                                  setUpdatingUser(
                                    username
                                  );

                                  socket.emit(
                                    "update_user_management",
                                    {
                                      admin:
                                        adminUsername,
                                      username:
                                        username,
                                      action:
                                        blocked
                                          ? "unblock"
                                          : "block"
                                    }
                                  );

                                  setTimeout(
                                    () => {
                                      setUpdatingUser(
                                        ""
                                      );

                                      socket.emit(
                                        "get_admin_users",
                                        {
                                          admin:
                                            adminUsername
                                        }
                                      );
                                    },
                                    500
                                  );
                                }}
                              >
                                {
                                  blocked
                                    ? "Unblock"
                                    : "Block"
                                }
                              </button>
                            </>
                          )}

                          {canManageRole && (
                            <>

                              <button
                                type="button"
                                className="user-action-button"
                                onClick={() => {
                                  const confirmAdmin =
                                    window.confirm(
                                      `Kya aap ${username} ko Admin banana chahte hain?`
                                    );

                                  if (
                                    !confirmAdmin
                                  ) {
                                    return;
                                  }

                                  socket.emit(
                                    "update_user_management",
                                    {
                                      admin:
                                        adminUsername,
                                      username:
                                        username,
                                      action:
                                        "make_admin"
                                    }
                                  );
                                }}
                              >
                                Make Admin
                              </button>

                              <button
                                type="button"
                                className="user-action-button"
                                onClick={() => {
                                  const confirmModerator =
                                    window.confirm(
                                      `Kya aap ${username} ko Moderator banana chahte hain?`
                                    );

                                  if (
                                    !confirmModerator
                                  ) {
                                    return;
                                  }

                                  socket.emit(
                                    "update_user_management",
                                    {
                                      admin:
                                        adminUsername,
                                      username:
                                        username,
                                      action:
                                        "make_moderator"
                                    }
                                  );
                                }}
                              >
                                Make Moderator
                              </button>

                              {userRole !==
                                "user" && (
                                <button
                                  type="button"
                                  className="user-action-button"
                                  onClick={() => {
                                    const confirmRemove =
                                      window.confirm(
                                        `Kya aap ${username} ka Admin/Moderator role remove karna chahte hain?`
                                      );

                                    if (
                                      !confirmRemove
                                    ) {
                                      return;
                                    }

                                    socket.emit(
                                      "update_user_management",
                                      {
                                        admin:
                                          adminUsername,
                                        username:
                                          username,
                                        action:
                                          "remove_role"
                                      }
                                    );
                                  }}
                                >
                                  Remove Role
                                </button>
                              )}

                            </>
                          )}

                        </div>
                      )}

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* ======================================
            POSTS & COMMENTS MANAGEMENT
        ====================================== */}

        <div className="admin-section">

          <div className="admin-section-header">

            <div>
              <h2>
                Posts & Comments Management
              </h2>

              <p>
                Users ki posts aur comments ko manage karein.
              </p>
            </div>

          </div>

          {adminPosts.length === 0 ? (

            <div className="admin-empty">

              <div>
                <strong>
                  No Posts Found
                </strong>

                <p>
                  Abhi koi public post available nahi hai.
                </p>
              </div>

            </div>

          ) : (

            <div>

              {adminPosts.map(
                (post) => (

                  <div
                    key={
                      post._id?.toString()
                    }
                    className="admin-post-management-card"
                  >

                    <div className="admin-post-management-header">

                      <div>

                        <strong>
                          {post.username}
                        </strong>

                        <div className="admin-post-management-date">
                          {
                            post.createdAt
                              ? new Date(
                                  post.createdAt
                                ).toLocaleString()
                              : ""
                          }
                        </div>

                      </div>

                      <button
                        type="button"
                        className="admin-delete-button"
                        onClick={() =>
                          deleteAdminPost(
                            post._id?.toString()
                          )
                        }
                      >
                        Delete Post
                      </button>

                    </div>

                    <div className="admin-post-management-content">
                      {post.content}
                    </div>

                    {Array.isArray(
                      post.comments
                    ) &&
                      post.comments.length >
                        0 && (

                        <div className="admin-post-management-comments">

                          <strong>
                            Comments (
                            {
                              post.comments.length
                            }
                            )
                          </strong>

                          {post.comments.map(
                            (comment) => (

                              <div
                                key={
                                  comment._id?.toString() ||
                                  (
                                    comment.username +
                                    "-" +
                                    comment.createdAt
                                  )
                                }
                                className="admin-comment-management-row"
                              >

                                <div>

                                  <strong>
                                    {
                                      comment.username
                                    }
                                  </strong>

                                  <div className="admin-comment-management-text">
                                    {
                                      comment.text
                                    }
                                  </div>

                                </div>

                                <button
                                  type="button"
                                  className="admin-delete-comment-button"
                                  onClick={() =>
                                    deleteAdminComment(
                                      post._id?.toString(),
                                      comment._id?.toString()
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            )
                          )}

                        </div>
                      )}

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* ======================================
            PENDING PROMOTIONS
        ====================================== */}

        <div className="admin-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Pending Promotions
              </h2>

              <p>
                Public users ki promotions
                approve ya reject karein.
              </p>

            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={
                refreshPendingPromotions
              }
            >
              Refresh
            </button>

          </div>

          {loadingPending ? (

            <div className="admin-loading">
              Pending promotions loading...
            </div>

          ) : pendingPromotions.length === 0 ? (

            <div className="admin-empty">

              <p>
                Abhi koi pending promotion
                request nahi hai.
              </p>

            </div>

          ) : (

            <div className="promotion-admin-list">

              {pendingPromotions.map(
                (
                  promotion,
                  index
                ) => (

                  <div
                    className="promotion-admin-card"
                    key={
                      promotion._id
                        ? String(
                            promotion._id
                          )
                        : index
                    }
                    style={{
                      border:
                        "2px solid #f59e0b",
                      background:
                        "#fffbeb"
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        alignItems:
                          "center",
                        gap:
                          "10px",
                        marginBottom:
                          "10px",
                        flexWrap:
                          "wrap"
                      }}
                    >

                      <strong
                        style={{
                          color:
                            "#b45309",
                          fontSize:
                            "13px"
                        }}
                      >
                        Pending Approval
                      </strong>

                      <small>
                        By:{" "}
                        <strong>
                          {
                            promotion.username ||
                            "Unknown"
                          }
                        </strong>
                      </small>

                    </div>

                    {promotion.image && (
                      <img
                        src={
                          promotion.image
                        }
                        alt="Promotion"
                        style={{
                          width:
                            "100%",
                          maxHeight:
                            "220px",
                          objectFit:
                            "cover",
                          borderRadius:
                            "8px",
                          marginBottom:
                            "10px",
                          display:
                            "block"
                        }}
                      />
                    )}

                    <h3>
                      {
                        promotion.title ||
                        "Promotion"
                      }
                    </h3>

                    {promotion.promotionTitle && (
                      <p
                        style={{
                          fontWeight:
                            "700",
                          color:
                            "#475569"
                        }}
                      >
                        {
                          promotion.promotionTitle
                        }
                      </p>
                    )}

                    <p>
                      {
                        promotion.description ||
                        "No description"
                      }
                    </p>

                    {promotion.link && (
                      <p
                        style={{
                          fontSize:
                            "11px",
                          wordBreak:
                            "break-all"
                        }}
                      >
                        {
                          promotion.link
                        }
                      </p>
                    )}

                    <small>
                      Submitted:{" "}
                      {
                        promotion.createdAt
                          ? new Date(
                              promotion.createdAt
                            ).toLocaleString()
                          : "N/A"
                      }
                    </small>

                    {/* IMPORTANT:
                        Main Admin + Admin + Moderator
                        can approve / decline.
                    */}

                    {isAdmin && (
                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "8px",
                          marginTop:
                            "12px",
                          flexWrap:
                            "wrap"
                        }}
                      >

                        <button
                          type="button"
                          className="admin-refresh-button"
                          onClick={() =>
                            approvePromotion(
                              promotion._id
                            )
                          }
                          style={{
                            background:
                              "#dcfce7",
                            color:
                              "#166534",
                            border:
                              "1px solid #86efac"
                          }}
                        >
                          Approve
                        </button>

                        <button
                          type="button"
                          className="delete-report-button"
                          onClick={() =>
                            rejectPromotion(
                              promotion._id
                            )
                          }
                        >
                          Decline
                        </button>

                      </div>
                    )}

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* ======================================
            REPORTS
        ====================================== */}

        <div className="admin-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Public Message Reports
              </h2>

              <p>
                Users ke reported public
                messages yahan nazar aayenge.
              </p>

            </div>

            <button
              type="button"
              className="admin-refresh-button"
              onClick={
                refreshReports
              }
            >
              Refresh
            </button>

          </div>

          {loadingReports ? (

            <div className="admin-loading">
              Reports loading...
            </div>

          ) : reports.length === 0 ? (

            <div className="admin-empty">

              <p>
                Abhi koi report nahi hai.
              </p>

            </div>

          ) : (

            <div className="reports-list">

              {reports.map(
                (
                  report,
                  index
                ) => (

                  <div
                    className="report-card"
                    key={
                      report._id
                        ? String(
                            report._id
                          )
                        : index
                    }
                  >

                    <div className="report-top">

                      <div>

                        <span className="report-label">
                          Reporter
                        </span>

                        <strong>
                          {
                            report.reporter
                          }
                        </strong>

                      </div>

                      <div>

                        <span className="report-label">
                          Reported User
                        </span>

                        <strong>
                          {
                            report.reportedUsername
                          }
                        </strong>

                      </div>

                    </div>

                    <div className="report-reason">

                      <span className="report-label">
                        Reason
                      </span>

                      <strong>
                        {
                          report.reason ||
                          "No reason provided"
                        }
                      </strong>

                    </div>

                    <div className="reported-message">

                      <span className="report-label">
                        Reported Message
                      </span>

                      <p>
                        {
                          report.message
                        }
                      </p>

                    </div>

                    <div className="report-bottom">

                      <div>

                        <small>
                          Message Time:{" "}
                          {
                            report.messageTime ||
                            "N/A"
                          }
                        </small>

                        <small>
                          Reported At:{" "}
                          {
                            report.createdAt
                              ? new Date(
                                  report.createdAt
                                ).toLocaleString()
                              : "N/A"
                          }
                        </small>

                      </div>

                      <button
                        type="button"
                        className="delete-report-button"
                        onClick={() =>
                          deleteReport(
                            report._id
                          )
                        }
                      >
                        Delete Report
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>

        {/* ======================================
            APPROVED PROMOTIONS
        ====================================== */}

        <div className="admin-section">

          <div className="admin-section-header">

            <div>

              <h2>
                Approved / Active Promotions
              </h2>

              <p>
                Public chat mein approved
                promotions manage karein.
              </p>

            </div>

            <div
              style={{
                display:
                  "flex",
                gap:
                  "8px",
                flexWrap:
                  "wrap"
              }}
            >

              <button
                type="button"
                className="admin-refresh-button"
                onClick={
                  refreshPromotions
                }
              >
                Refresh
              </button>

              <button
                type="button"
                className="admin-refresh-button"
                onClick={() =>
                  setShowPromotionForm(
                    !showPromotionForm
                  )
                }
              >
                {
                  showPromotionForm
                    ? "Close"
                    : "New Promotion"
                }
              </button>

            </div>

          </div>

          {/* NEW PROMOTION FORM */}

          {showPromotionForm && (

            <div
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                borderRadius:
                  "10px",
                padding:
                  "15px",
                marginBottom:
                  "15px"
              }}
            >

              <div
                style={{
                  marginBottom:
                    "10px"
                }}
              >

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "11px",
                    fontWeight:
                      "700",
                    color:
                      "#64748b",
                    marginBottom:
                      "5px"
                  }}
                >
                  Promotion Title
                </label>

                <input
                  type="text"
                  value={
                    promotionTitle
                  }
                  onChange={(event) =>
                    setPromotionTitle(
                      event.target.value
                    )
                  }
                  placeholder="Example: Special Offer"
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "9px 10px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "7px",
                    fontSize:
                      "12px",
                    outline:
                      "none"
                  }}
                />

              </div>

              <div
                style={{
                  marginBottom:
                    "10px"
                }}
              >

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "11px",
                    fontWeight:
                      "700",
                    color:
                      "#64748b",
                    marginBottom:
                      "5px"
                  }}
                >
                  Promotion Message
                </label>

                <textarea
                  value={
                    promotionDescription
                  }
                  onChange={(event) =>
                    setPromotionDescription(
                      event.target.value
                    )
                  }
                  placeholder="Promotion ka message likhein..."
                  rows="3"
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "9px 10px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "7px",
                    fontSize:
                      "12px",
                    resize:
                      "vertical",
                    outline:
                      "none"
                  }}
                />

              </div>

              <div
                style={{
                  marginBottom:
                    "10px"
                }}
              >

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "11px",
                    fontWeight:
                      "700",
                    color:
                      "#64748b",
                    marginBottom:
                      "5px"
                  }}
                >
                  Promotion Link
                </label>

                <input
                  type="text"
                  value={
                    promotionLink
                  }
                  onChange={(event) =>
                    setPromotionLink(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com"
                  style={{
                    width:
                      "100%",
                    boxSizing:
                      "border-box",
                    padding:
                      "9px 10px",
                    border:
                      "1px solid #cbd5e1",
                    borderRadius:
                      "7px",
                    fontSize:
                      "12px",
                    outline:
                      "none"
                  }}
                />

              </div>

              <div
                style={{
                  marginBottom:
                    "12px"
                }}
              >

                <label
                  style={{
                    display:
                      "block",
                    fontSize:
                      "11px",
                    fontWeight:
                      "700",
                    color:
                      "#64748b",
                    marginBottom:
                      "6px"
                  }}
                >
                  Promotion Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handlePromotionImage
                  }
                  style={{
                    width:
                      "100%",
                    fontSize:
                      "12px"
                  }}
                />

                {promotionImage && (

                  <div
                    style={{
                      marginTop:
                        "10px"
                    }}
                  >

                    <img
                      src={
                        promotionImage
                      }
                      alt="Promotion Preview"
                      style={{
                        width:
                          "100%",
                        maxWidth:
                          "350px",
                        maxHeight:
                          "220px",
                        objectFit:
                          "cover",
                        borderRadius:
                          "8px",
                        border:
                          "1px solid #cbd5e1",
                        display:
                          "block"
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setPromotionImage(
                          ""
                        )
                      }
                      style={{
                        marginTop:
                          "7px",
                        padding:
                          "6px 10px",
                        border:
                          "none",
                        borderRadius:
                          "6px",
                        cursor:
                          "pointer",
                        background:
                          "#fee2e2",
                        color:
                          "#b91c1c",
                        fontSize:
                          "11px",
                        fontWeight:
                          "700"
                      }}
                    >
                      Remove Image
                    </button>

                  </div>
                )}

              </div>

              <label
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "7px",
                  fontSize:
                    "12px",
                  color:
                    "#334155",
                  marginBottom:
                    "12px",
                  cursor:
                    "pointer"
                }}
              >

                <input
                  type="checkbox"
                  checked={
                    promotionActive
                  }
                  onChange={(event) =>
                    setPromotionActive(
                      event.target.checked
                    )
                  }
                />

                Promotion Active

              </label>

              <button
                type="button"
                className="admin-refresh-button"
                onClick={
                  createPromotion
                }
              >
                Create Promotion
              </button>

            </div>
          )}

          {/* PROMOTIONS */}

          {loadingPromotions ? (

            <div className="admin-loading">
              Promotions loading...
            </div>

          ) : promotions.length === 0 ? (

            <div className="admin-empty">

              <p>
                Abhi koi approved promotion
                nahi hai.
              </p>

            </div>

          ) : (

            <div className="promotion-admin-list">

              {promotions.map(
                (
                  promotion,
                  index
                ) => (

                  <div
                    className="promotion-admin-card"
                    key={
                      promotion._id
                        ? String(
                            promotion._id
                          )
                        : index
                    }
                  >

                    {promotion.image && (
                      <img
                        src={
                          promotion.image
                        }
                        alt="Promotion"
                        style={{
                          width:
                            "100%",
                          maxHeight:
                            "220px",
                          objectFit:
                            "cover",
                          borderRadius:
                            "8px",
                          marginBottom:
                            "10px",
                          display:
                            "block"
                        }}
                      />
                    )}

                    <h3>
                      {
                        promotion.title ||
                        "Promotion"
                      }
                    </h3>

                    {promotion.promotionTitle && (
                      <p
                        style={{
                          fontWeight:
                            "700",
                          color:
                            "#475569"
                        }}
                      >
                        {
                          promotion.promotionTitle
                        }
                      </p>
                    )}

                    <p>
                      {
                        promotion.description ||
                        "No description"
                      }
                    </p>

                    {promotion.link && (
                      <p
                        style={{
                          fontSize:
                            "11px",
                          wordBreak:
                            "break-all"
                        }}
                      >
                        {
                          promotion.link
                        }
                      </p>
                    )}

                    <small>
                      Created By:{" "}
                      <strong>
                        {
                          promotion.username ||
                          "Unknown"
                        }
                      </strong>
                    </small>

                    <br />

                    <small>
                      Status:{" "}
                      {
                        promotion.active &&
                        promotion.approved !==
                          false
                          ? "Approved / Active"
                          : "Inactive"
                      }
                    </small>

                    {/* Admin + Moderator + Main Admin
                        can manage promotions */}

                    {isAdmin && (
                      <div
                        style={{
                          display:
                            "flex",
                          gap:
                            "7px",
                          marginTop:
                            "10px",
                          flexWrap:
                            "wrap"
                        }}
                      >

                        <button
                          type="button"
                          className="admin-refresh-button"
                          onClick={() =>
                            togglePromotion(
                              promotion
                            )
                          }
                        >
                          {
                            promotion.active
                              ? "Deactivate"
                              : "Activate"
                          }
                        </button>

                        <button
                          type="button"
                          className="delete-report-button"
                          onClick={() =>
                            deletePromotion(
                              promotion._id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>
                    )}

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default Admin;
