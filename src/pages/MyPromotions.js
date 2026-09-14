import React, { useEffect, useState } from "react";
import { socket } from "../socket";

function MyPromotions() {
  const username =
    localStorage.getItem("username") || "";

  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // CREATE PROMOTION FORM
  // ==========================================

  const [showCreateForm, setShowCreateForm] =
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

  const [creating, setCreating] =
    useState(false);

  // ==========================================
  // LOAD MY PROMOTIONS
  // ==========================================

  useEffect(() => {
    if (!username || username === "Guest") {
      setLoading(false);
      return;
    }

    const handleMyPromotions = (data) => {
      console.log(
        "MY PROMOTIONS RECEIVED:",
        data
      );

      setPromotions(data || []);
      setLoading(false);
    };

    const handleCreated = (data) => {
      if (!data) return;

      if (
        String(data.username).toLowerCase() !==
        String(username).toLowerCase()
      ) {
        return;
      }

      setPromotions((old) => [
        data,
        ...old.filter(
          (item) =>
            String(item._id) !==
            String(data._id)
        ),
      ]);

      setCreating(false);
      setShowCreateForm(false);

      setPromotionTitle("");
      setPromotionDescription("");
      setPromotionLink("");
      setPromotionImage("");
      setPromotionActive(true);
    };

    const handleUpdated = (data) => {
      if (!data) return;

      setPromotions((old) =>
        old.map((item) =>
          String(item._id) ===
          String(data._id)
            ? data
            : item
        )
      );
    };

    const handleDeleted = (data) => {
      if (!data || !data.deletedId) {
        return;
      }

      setPromotions((old) =>
        old.filter(
          (item) =>
            String(item._id) !==
            String(data.deletedId)
        )
      );
    };

    socket.on(
      "my_promotions_data",
      handleMyPromotions
    );

    socket.on(
      "promotion_created",
      handleCreated
    );

    socket.on(
      "my_promotion_updated",
      handleUpdated
    );

    socket.on(
      "my_promotion_deleted",
      handleDeleted
    );

    socket.emit(
      "get_my_promotions",
      {
        username,
      }
    );

    return () => {
      socket.off(
        "my_promotions_data",
        handleMyPromotions
      );

      socket.off(
        "promotion_created",
        handleCreated
      );

      socket.off(
        "my_promotion_updated",
        handleUpdated
      );

      socket.off(
        "my_promotion_deleted",
        handleDeleted
      );
    };
  }, [username]);

  // ==========================================
  // IMAGE SELECT
  // ==========================================

  const handlePromotionImage = (event) => {
    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert(
        "Sirf image file select karein."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
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
  // CREATE PROMOTION
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
        "Promotion title likhein."
      );
      return;
    }

    if (!description) {
      alert(
        "Promotion description likhein."
      );
      return;
    }

    setCreating(true);

    socket.emit(
      "create_promotion",
      {
        username,

        title,

        description,

        link,

        image:
          promotionImage,

        active:
          promotionActive,

        promotionTitle:
          "⭐ Special Offer",
      }
    );
  };

  // ==========================================
  // DELETE PROMOTION
  // ==========================================

  const deletePromotion = (promotionId) => {
    const confirmDelete =
      window.confirm(
        "Kya aap ye promotion delete karna chahte hain?"
      );

    if (!confirmDelete) {
      return;
    }

    socket.emit(
      "delete_my_promotion",
      {
        promotionId,
        username,
      }
    );
  };

  // ==========================================
  // TOGGLE PROMOTION
  // ==========================================

  const togglePromotion = (promotion) => {
    socket.emit(
      "update_my_promotion",
      {
        promotionId:
          promotion._id,

        username,

        title:
          promotion.title || "",

        description:
          promotion.description || "",

        link:
          promotion.link || "",

        image:
          promotion.image || "",

        promotionTitle:
          promotion.promotionTitle ||
          "⭐ Special Offer",

        active:
          !promotion.active,
      }
    );
  };

  // ==========================================
  // LOGIN REQUIRED
  // ==========================================

  if (!username || username === "Guest") {
    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "40px auto",
          padding: "20px",
          textAlign: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2>
          🔒 Login Required
        </h2>

        <p>
          Apni promotions dekhne ke liye
          pehle login karein.
        </p>
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        padding: "20px",
        boxSizing: "border-box",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            background:
              "linear-gradient(135deg, #0f172a, #1e3a8a)",
            color: "#fff",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "18px",
            boxShadow:
              "0 5px 18px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >

            <div>

              <h1
                style={{
                  margin: "0 0 7px",
                  fontSize: "24px",
                }}
              >
                📢 My Promotions
              </h1>

              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  opacity: 0.9,
                }}
              >
                Yahan aap apni tamam
                promotions manage kar sakte hain.
              </p>

            </div>

            {/* CREATE BUTTON */}

            <button
              type="button"
              onClick={() =>
                setShowCreateForm(
                  !showCreateForm
                )
              }
              style={{
                border: "none",
                borderRadius: "9px",
                padding: "10px 15px",
                cursor: "pointer",
                background: "#fff",
                color: "#1e3a8a",
                fontSize: "12px",
                fontWeight: "800",
                boxShadow:
                  "0 3px 10px rgba(0,0,0,0.18)",
              }}
            >
              {showCreateForm
                ? "✖ Close"
                : "➕ Create New Promotion"}
            </button>

          </div>
        </div>

        {/* CREATE FORM */}

        {showCreateForm && (
          <div
            style={{
              background: "#fff",
              borderRadius: "13px",
              padding: "18px",
              marginBottom: "18px",
              boxShadow:
                "0 3px 14px rgba(0,0,0,0.08)",
              border:
                "1px solid #dbeafe",
            }}
          >

            <h2
              style={{
                margin:
                  "0 0 6px",
                fontSize: "18px",
                color: "#0f172a",
              }}
            >
              📢 Promote Your Business
            </h2>

            <p
              style={{
                margin:
                  "0 0 16px",
                color: "#64748b",
                fontSize: "12px",
                lineHeight: "1.5",
              }}
            >
              Apni product ya service ko
              Selling GupShup par showcase
              karein aur customers tak
              pohanchayein.
            </p>

            {/* TITLE */}

            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "#475569",
                marginBottom: "5px",
              }}
            >
              Promotion Title
            </label>

            <input
              type="text"
              value={promotionTitle}
              onChange={(e) =>
                setPromotionTitle(
                  e.target.value
                )
              }
              placeholder="Example: Special Product Offer"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                marginBottom: "12px",
                fontSize: "12px",
                outline: "none",
              }}
            />

            {/* DESCRIPTION */}

            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "#475569",
                marginBottom: "5px",
              }}
            >
              Promotion Description
            </label>

            <textarea
              value={
                promotionDescription
              }
              onChange={(e) =>
                setPromotionDescription(
                  e.target.value
                )
              }
              placeholder="Apni product ya service ke bare mein likhein..."
              rows="4"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                marginBottom: "12px",
                fontSize: "12px",
                resize: "vertical",
                outline: "none",
              }}
            />

            {/* LINK */}

            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "#475569",
                marginBottom: "5px",
              }}
            >
              Website / Contact Link
            </label>

            <input
              type="text"
              value={promotionLink}
              onChange={(e) =>
                setPromotionLink(
                  e.target.value
                )
              }
              placeholder="https://example.com"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px",
                border:
                  "1px solid #cbd5e1",
                borderRadius: "8px",
                marginBottom: "12px",
                fontSize: "12px",
                outline: "none",
              }}
            />

            {/* IMAGE */}

            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: "700",
                color: "#475569",
                marginBottom: "6px",
              }}
            >
              🖼️ Product / Promotion Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={
                handlePromotionImage
              }
              style={{
                width: "100%",
                fontSize: "12px",
                marginBottom: "10px",
              }}
            />

            {promotionImage && (
              <div
                style={{
                  marginBottom: "12px",
                }}
              >

                <img
                  src={promotionImage}
                  alt="Promotion Preview"
                  style={{
                    width: "100%",
                    maxWidth: "350px",
                    maxHeight: "220px",
                    objectFit: "cover",
                    borderRadius: "8px",
                    display: "block",
                    border:
                      "1px solid #cbd5e1",
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setPromotionImage("")
                  }
                  style={{
                    marginTop: "7px",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    background: "#fee2e2",
                    color: "#b91c1c",
                    fontSize: "11px",
                    fontWeight: "700",
                  }}
                >
                  ✖ Remove Image
                </button>

              </div>
            )}

            {/* ACTIVE */}

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "12px",
                color: "#334155",
                marginBottom: "14px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={
                  promotionActive
                }
                onChange={(e) =>
                  setPromotionActive(
                    e.target.checked
                  )
                }
              />

              Promotion Active
            </label>

            {/* CREATE */}

            <button
              type="button"
              disabled={creating}
              onClick={
                createPromotion
              }
              style={{
                border: "none",
                borderRadius: "8px",
                padding: "10px 16px",
                cursor: creating
                  ? "not-allowed"
                  : "pointer",
                background: creating
                  ? "#94a3b8"
                  : "#1e3a8a",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "800",
              }}
            >
              {creating
                ? "⏳ Creating..."
                : "📢 Create Promotion"}
            </button>

          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              boxShadow:
                "0 3px 12px rgba(0,0,0,0.08)",
            }}
          >
            Promotions loading...
          </div>
        )}

        {/* EMPTY */}

        {!loading &&
          promotions.length === 0 && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "35px 20px",
                textAlign: "center",
                boxShadow:
                  "0 3px 12px rgba(0,0,0,0.08)",
              }}
            >

              <div
                style={{
                  fontSize: "45px",
                  marginBottom: "10px",
                }}
              >
                📢
              </div>

              <h3
                style={{
                  margin: "0 0 7px",
                  color: "#334155",
                }}
              >
                No Promotions Yet
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "13px",
                }}
              >
                Aapki banayi hui promotions
                yahan nazar aayengi.
              </p>

            </div>
          )}

        {/* PROMOTIONS */}

        {!loading &&
          promotions.length > 0 &&
          promotions.map(
            (promotion, index) => (
              <div
                key={
                  promotion._id
                    ? String(
                        promotion._id
                      )
                    : index
                }
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "15px",
                  marginBottom: "15px",
                  boxShadow:
                    "0 3px 12px rgba(0,0,0,0.08)",
                  border:
                    promotion.active
                      ? "1px solid #bbf7d0"
                      : "1px solid #fecaca",
                }}
              >

                {/* IMAGE */}

                {promotion.image && (
                  <img
                    src={
                      promotion.image
                    }
                    alt="Promotion"
                    style={{
                      width: "100%",
                      maxHeight: "260px",
                      objectFit: "cover",
                      borderRadius: "9px",
                      display: "block",
                      marginBottom: "12px",
                    }}
                  />
                )}

                {/* TITLE */}

                <h2
                  style={{
                    margin:
                      "0 0 7px",
                    fontSize: "19px",
                    color: "#0f172a",
                  }}
                >
                  {promotion.title ||
                    "Promotion"}
                </h2>

                {/* DESCRIPTION */}

                <p
                  style={{
                    margin:
                      "0 0 10px",
                    color: "#475569",
                    fontSize: "13px",
                    lineHeight: "1.5",
                    whiteSpace:
                      "pre-wrap",
                  }}
                >
                  {promotion.description ||
                    "No description"}
                </p>

                {/* LINK */}

                {promotion.link && (
                  <div
                    style={{
                      marginBottom:
                        "10px",
                      fontSize: "12px",
                      wordBreak:
                        "break-all",
                    }}
                  >
                    🔗{" "}
                    {promotion.link}
                  </div>
                )}

                {/* STATUS */}

                <div
                  style={{
                    display:
                      "inline-block",
                    padding:
                      "5px 9px",
                    borderRadius:
                      "20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    background:
                      promotion.active
                        ? "#dcfce7"
                        : "#fee2e2",
                    color:
                      promotion.active
                        ? "#166534"
                        : "#991b1b",
                    marginBottom:
                      "12px",
                  }}
                >
                  {promotion.active
                    ? "🟢 Active"
                    : "🔴 Inactive"}
                </div>

                {/* BUTTONS */}

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap:
                      "wrap",
                  }}
                >

                  <button
                    type="button"
                    onClick={() =>
                      togglePromotion(
                        promotion
                      )
                    }
                    style={{
                      border: "none",
                      borderRadius: "7px",
                      padding:
                        "8px 12px",
                      cursor:
                        "pointer",
                      background:
                        promotion.active
                          ? "#fef3c7"
                          : "#dcfce7",
                      color:
                        promotion.active
                          ? "#92400e"
                          : "#166534",
                      fontSize:
                        "12px",
                      fontWeight:
                        "700",
                    }}
                  >
                    {promotion.active
                      ? "⏸️ Deactivate"
                      : "▶️ Activate"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deletePromotion(
                        promotion._id
                      )
                    }
                    style={{
                      border: "none",
                      borderRadius: "7px",
                      padding:
                        "8px 12px",
                      cursor:
                        "pointer",
                      background:
                        "#fee2e2",
                      color:
                        "#b91c1c",
                      fontSize:
                        "12px",
                      fontWeight:
                        "700",
                    }}
                  >
                    🗑️ Delete
                  </button>

                </div>

              </div>
            )
          )}

      </div>
    </div>
  );
}

export default MyPromotions;