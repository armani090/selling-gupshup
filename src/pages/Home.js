import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket } from "../socket";

function Home() {
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState([]);
  const [expandedComments, setExpandedComments] = useState({});
  const [postMediaFile, setPostMediaFile] = useState(null);
  const [postMediaPreview, setPostMediaPreview] = useState("");
  const [postMediaType, setPostMediaType] = useState("");
  const [uploadingPost, setUploadingPost] = useState(false);
  const [promotions, setPromotions] = useState([]);
  const [openModerationMenu, setOpenModerationMenu] = useState(null);

  const username =
    localStorage.getItem("username") ||
    localStorage.getItem("login") ||
    "";

  const storedRole = (
    localStorage.getItem("role") || ""
  )
    .trim()
    .toLowerCase();

  const normalizedUsername = username
    .trim()
    .toLowerCase();

  const canModerate =
    normalizedUsername === "armani" ||
    storedRole === "admin" ||
    storedRole === "moderator";

  const isMainAdmin = (targetUsername) =>
    String(targetUsername || "")
      .trim()
      .toLowerCase() === "armani";

  useEffect(() => {
    socket.emit("get_posts");

    const handlePostsHistory = (postList) => {
      setPosts(Array.isArray(postList) ? postList : []);
    };

    const handleNewPost = (post) => {
      setPosts((currentPosts) => [post, ...currentPosts]);
    };

    const handlePostLiked = (data) => {
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id?.toString() === data.postId
            ? {
                ...post,
                likedBy: data.likedBy,
                likes: data.likes,
                loveBy: data.loveBy,
                loves: data.loves,
                dislikeBy: data.dislikeBy,
                dislikes: data.dislikes,
              }
            : post
        )
      );
    };

    const handlePostCommented = (data) => {
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id?.toString() === data.postId
            ? {
                ...post,
                comments: data.comments,
              }
            : post
        )
      );
    };

    const handlePostDeleted = (data) => {
      const postId = String(data?.postId || "");

      if (!postId) {
        return;
      }

      setPosts((currentPosts) =>
        currentPosts.filter(
          (post) => String(post?._id) !== postId
        )
      );

      setOpenModerationMenu(null);
    };

    const handlePostCommentDeleted = (data) => {
      const postId = String(data?.postId || "");

      if (!postId) {
        return;
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          String(post?._id) === postId
            ? {
                ...post,
                comments: Array.isArray(data?.comments)
                  ? data.comments
                  : [],
              }
            : post
        )
      );

      setOpenModerationMenu(null);
    };

    socket.on("posts_history", handlePostsHistory);
    socket.on("new_post", handleNewPost);
    socket.on("post_liked", handlePostLiked);
    socket.on("post_commented", handlePostCommented);
    socket.on("post_deleted", handlePostDeleted);
    socket.on(
      "post_comment_deleted",
      handlePostCommentDeleted
    );

    return () => {
      socket.off("posts_history", handlePostsHistory);
      socket.off("new_post", handleNewPost);
      socket.off("post_liked", handlePostLiked);
      socket.off("post_commented", handlePostCommented);
      socket.off("post_deleted", handlePostDeleted);
      socket.off(
        "post_comment_deleted",
        handlePostCommentDeleted
      );
    };
  }, []);

  useEffect(() => {
    const handlePromotions = (promotionList) => {
      setPromotions(
        Array.isArray(promotionList)
          ? promotionList
          : []
      );
    };

    socket.on("promotions_data", handlePromotions);

    if (socket.connected) {
      socket.emit("get_promotions");
    } else {
      const requestPromotions = () => {
        socket.emit("get_promotions");
      };

      socket.once("connect", requestPromotions);
    }

    const refreshPromotions = setInterval(() => {
      if (socket.connected) {
        socket.emit("get_promotions");
      }
    }, 10000);

    return () => {
      socket.off(
        "promotions_data",
        handlePromotions
      );

      clearInterval(refreshPromotions);
    };
  }, []);

  const handlePromotionClick = (promotion) => {
    if (promotion && promotion.link) {
      window.open(
        promotion.link,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    alert("Promotion details coming soon.");
  };

  const handlePostReaction = (post, reaction) => {
    if (!username) {
      alert(
        "Reaction dene ke liye pehle login karein."
      );
      return;
    }

    const postId = post._id?.toString();

    if (!postId) {
      return;
    }

    socket.emit("post_reaction", {
      postId: postId,
      username: username,
      reaction: reaction,
    });
  };

  const handleAddComment = (post) => {
    if (!username) {
      alert(
        "Comment karne ke liye pehle login karein."
      );
      return;
    }

    const commentText = window.prompt(
      "Apna comment likhein:"
    );

    if (!commentText || !commentText.trim()) {
      return;
    }

    const postId = post._id?.toString();

    if (!postId) {
      return;
    }

    socket.emit("add_post_comment", {
      postId: postId,
      username: username,
      comment: commentText.trim(),
    });
  };

  const toggleComments = (postId) => {
    setExpandedComments((current) => ({
      ...current,
      [postId]: !current[postId],
    }));
  };

  const toggleModerationMenu = (menuId) => {
    setOpenModerationMenu((current) =>
      current === menuId ? null : menuId
    );
  };

  const closeModerationMenu = () => {
    setOpenModerationMenu(null);
  };

  const handleAdminDeletePost = (
    post,
    shouldBlockUser = false
  ) => {
    if (!canModerate) {
      return;
    }

    const postId = post?._id?.toString();

    if (!postId) {
      return;
    }

    if (
      !isMainAdmin(username) &&
      isMainAdmin(post?.username)
    ) {
      alert(
        "Main Admin ki post delete nahi ki ja sakti."
      );

      closeModerationMenu();
      return;
    }

    const confirmMessage = shouldBlockUser
      ? "Kya aap " +
        (post?.username || "is user") +
        " ki post delete karke user ko block karna chahte hain?"
      : "Kya aap ye post delete karna chahte hain?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    socket.emit("admin_delete_post", {
      admin: username,
      postId: postId,
      blockUser: shouldBlockUser,
    });

    closeModerationMenu();
  };

  const handleAdminDeleteComment = (
    post,
    comment,
    shouldBlockUser = false
  ) => {
    if (!canModerate) {
      return;
    }

    const postId = post?._id?.toString();
    const commentId = comment?._id?.toString();

    if (!postId || !commentId) {
      return;
    }

    if (
      !isMainAdmin(username) &&
      isMainAdmin(comment?.username)
    ) {
      alert(
        "Main Admin ka comment delete nahi kiya ja sakta."
      );

      closeModerationMenu();
      return;
    }

    const confirmMessage = shouldBlockUser
      ? "Kya aap " +
        (comment?.username || "is user") +
        " ka comment delete karke user ko block karna chahte hain?"
      : "Kya aap ye comment delete karna chahte hain?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    socket.emit("admin_delete_post_comment", {
      admin: username,
      postId: postId,
      commentId: commentId,
      blockUser: shouldBlockUser,
    });

    closeModerationMenu();
  };

  const handlePostMediaChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      alert(
        "Sirf picture ya video select karein."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      alert(
        "File maximum 15 MB ki ho sakti hai."
      );

      event.target.value = "";
      return;
    }

    if (postMediaPreview) {
      URL.revokeObjectURL(postMediaPreview);
    }

    const previewUrl = URL.createObjectURL(file);

    setPostMediaFile(file);
    setPostMediaPreview(previewUrl);

    if (file.type.startsWith("image/")) {
      setPostMediaType("image");
    } else {
      setPostMediaType("video");
    }
  };

  const removePostMedia = () => {
    if (postMediaPreview) {
      URL.revokeObjectURL(postMediaPreview);
    }

    setPostMediaFile(null);
    setPostMediaPreview("");
    setPostMediaType("");

    const mediaInput = document.getElementById(
      "post-media-input"
    );

    if (mediaInput) {
      mediaInput.value = "";
    }
  };

  const handleCreatePost = async () => {
    const content = postText.trim();

    if (!username) {
      alert(
        "Post karne ke liye pehle login karein."
      );
      return;
    }

    if (!content && !postMediaFile) {
      return;
    }

    if (uploadingPost) {
      return;
    }

    try {
      setUploadingPost(true);

      let mediaUrl = "";
      let mediaType = "";

      if (postMediaFile) {
        const formData = new FormData();

        formData.append(
          "media",
          postMediaFile
        );

        const response = await fetch(
          (window.location.hostname === "localhost" ? "http://localhost:5000/upload-post-media" : "/upload-post-media"),
          {
            method: "POST",
            body: formData,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Media upload nahi ho saki."
          );
        }

        mediaUrl =
          "http://localhost:5000" +
          result.mediaUrl;

        mediaType =
          result.mediaType ||
          postMediaType;
      }

      socket.emit("create_post", {
        username: username,
        content: content,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
      });

      setPostText("");
      removePostMedia();
    } catch (error) {
      console.error(
        "Create post error:",
        error
      );

      alert(
        error.message ||
          "Post create nahi ho saki."
      );
    } finally {
      setUploadingPost(false);
    }
  };

  return (
    <div
      className="home-container"
      onClick={(event) => {
        if (
          event.target.closest(
            ".home-moderation-wrapper"
          )
        ) {
          return;
        }

        closeModerationMenu();
      }}
    >
      <div className="home-hero">
        <h1>
          {"\u{1F4AC}"} Selling GupShup
        </h1>

        <h2>
          Pakistan's Public Community Platform
        </h2>

        <p>
          Connect with people, share your thoughts,
          and join conversations from all over Pakistan.
        </p>

        <div className="home-hero-buttons">
          <Link to="/chat">
            <button>
              {"\u{1F4AC}"} Start Chatting
            </button>
          </Link>

          <Link to="/signup">
            <button>
              {"\u{1F4DD}"} Create Account
            </button>
          </Link>
        </div>
      </div>

      <div className="home-main-layout">
        <main className="home-content-column">
          <div className="post-create-box">
            <h2>
              {"\u{1F4DD}"} Create a Post
            </h2>

            <textarea
              className="post-input"
              value={postText}
              onChange={(e) =>
                setPostText(e.target.value)
              }
              placeholder={
                username
                  ? "What's on your mind?"
                  : "Login karke post karein..."
              }
              disabled={!username}
            />

            <div className="post-media-select">
              <label
                htmlFor="post-media-input"
                className="post-media-button"
              >
                {"\u{1F4F7}"} Add Picture / Video
              </label>

              <input
                id="post-media-input"
                type="file"
                accept="image/*,video/*"
                onChange={handlePostMediaChange}
                disabled={
                  !username ||
                  uploadingPost
                }
                style={{
                  display: "none",
                }}
              />
            </div>

            {postMediaPreview && (
              <div className="post-media-preview">
                {postMediaType === "image" ? (
                  <img
                    src={postMediaPreview}
                    alt="Post preview"
                    className="post-preview-image"
                  />
                ) : (
                  <video
                    src={postMediaPreview}
                    controls
                    className="post-preview-video"
                  />
                )}

                <button
                  type="button"
                  className="remove-post-media-button"
                  onClick={removePostMedia}
                  disabled={uploadingPost}
                >
                  {"\u2716"} Remove
                </button>
              </div>
            )}

            <button
              className="post-button"
              onClick={handleCreatePost}
              disabled={
                !username ||
                uploadingPost ||
                (!postText.trim() &&
                  !postMediaFile)
              }
            >
              {uploadingPost
                ? "\u23F3 Uploading..."
                : "\u{1F4E4} Post"}
            </button>
          </div>

          <div className="posts-feed">
            <h2>
              {"\u{1F465}"} Community Posts
            </h2>

            {posts.length === 0 ? (
              <p>
                Abhi koi post nahi hai.
                Pehli post aap karein! {"\u{1F389}"}
              </p>
            ) : (
              posts.map((post, index) => {
                const postId =
                  post._id?.toString();

                const postMenuId =
                  "post-" +
                  (postId || String(index));

                const canDeleteThisPost =
                  canModerate &&
                  (
                    isMainAdmin(username) ||
                    !isMainAdmin(post?.username)
                  );

                const postKey =
                  postId ||
                  String(post.username) +
                    "-" +
                    String(post.createdAt) +
                    "-" +
                    String(index);

                return (
                  <div
                    className="post-card"
                    key={postKey}
                    style={{
                      position: "relative",
                    }}
                  >
                    <div className="post-author">
                      {post.profileImage ? (
                        <img
                          src={post.profileImage}
                          alt={post.username}
                          className="post-author-avatar"
                        />
                      ) : (
                        <div className="post-author-avatar post-author-avatar-fallback">
                          {"\u{1F464}"}
                        </div>
                      )}

                      <span>
                        {post.username}
                      </span>

                      {canDeleteThisPost && (
                        <div
                          className="home-moderation-wrapper"
                          style={{
                            marginLeft: "auto",
                            position: "relative",
                          }}
                        >
                          <button
                            type="button"
                            aria-label="Post moderation menu"
                            onClick={(event) => {
                              event.stopPropagation();

                              toggleModerationMenu(
                                postMenuId
                              );
                            }}
                            style={{
                              border: "none",
                              background: "transparent",
                              fontSize: "24px",
                              cursor: "pointer",
                              padding: "2px 8px",
                              lineHeight: 1,
                            }}
                          >
                            {"\u22EE"}
                          </button>

                          {openModerationMenu ===
                            postMenuId && (
                            <div
                              className="home-moderation-menu"
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              style={{
                                position: "absolute",
                                right: 0,
                                top: "32px",
                                zIndex: 1000,
                                minWidth: "220px",
                                background: "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "10px",
                                boxShadow:
                                  "0 5px 18px rgba(0,0,0,0.18)",
                                padding: "6px",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleAdminDeletePost(
                                    post,
                                    false
                                  )
                                }
                                style={{
                                  display: "block",
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  padding: "10px",
                                  cursor: "pointer",
                                  borderRadius: "7px",
                                }}
                              >
                                {"\u{1F5D1}\uFE0F"} Delete Post
                              </button>

                              {!isMainAdmin(
                                post?.username
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAdminDeletePost(
                                      post,
                                      true
                                    )
                                  }
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    border: "none",
                                    background: "transparent",
                                    padding: "10px",
                                    cursor: "pointer",
                                    borderRadius: "7px",
                                  }}
                                >
                                  {"\u{1F6AB}"} Delete & Block User
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {post.content && (
                      <div className="post-content">
                        {post.content}
                      </div>
                    )}

                    {post.mediaUrl &&
                      post.mediaType === "image" && (
                      <div className="post-media-display">
                        <img
                          src={post.mediaUrl}
                          alt={
                            "Post by " +
                            post.username
                          }
                          className="post-image"
                        />
                      </div>
                    )}

                    {post.mediaUrl &&
                      post.mediaType === "video" && (
                      <div className="post-media-display">
                        <video
                          src={post.mediaUrl}
                          controls
                          preload="metadata"
                          className="post-video"
                        />
                      </div>
                    )}

                    <div className="post-actions">
                      <button
                        className="post-reaction-button"
                        onClick={() =>
                          handlePostReaction(
                            post,
                            "like"
                          )
                        }
                        disabled={!username}
                      >
                        {Array.isArray(post.likedBy) &&
                        post.likedBy.includes(username)
                          ? "\u{1F44D} Liked"
                          : "\u{1F44D} Like"}
                      </button>

                      <button
                        className="post-reaction-button"
                        onClick={() =>
                          handlePostReaction(
                            post,
                            "love"
                          )
                        }
                        disabled={!username}
                      >
                        {Array.isArray(post.loveBy) &&
                        post.loveBy.includes(username)
                          ? "\u2764\uFE0F Loved"
                          : "\u2764\uFE0F Love"}
                      </button>

                      <button
                        className="post-reaction-button"
                        onClick={() =>
                          handlePostReaction(
                            post,
                            "dislike"
                          )
                        }
                        disabled={!username}
                      >
                        {Array.isArray(post.dislikeBy) &&
                        post.dislikeBy.includes(username)
                          ? "\u{1F44E} Disliked"
                          : "\u{1F44E} Dislike"}
                      </button>

                      <span className="post-like-count">
                        {"\u{1F44D}"}{" "}
                        {post.likes || 0}
                      </span>

                      <span className="post-like-count">
                        {"\u2764\uFE0F"}{" "}
                        {post.loves || 0}
                      </span>

                      <span className="post-like-count">
                        {"\u{1F44E}"}{" "}
                        {post.dislikes || 0}
                      </span>
                    </div>

                    <div className="post-comments-section">
                      <button
                        className="post-comment-button"
                        onClick={() =>
                          handleAddComment(post)
                        }
                        disabled={!username}
                      >
                        {"\u{1F4AC}"} Comment (
                        {Array.isArray(post.comments)
                          ? post.comments.length
                          : 0}
                        )
                      </button>

                      {Array.isArray(post.comments) &&
                        post.comments.length > 3 && (
                        <button
                          className="post-view-comments-button"
                          onClick={() =>
                            toggleComments(
                              postId
                            )
                          }
                        >
                          {expandedComments[
                            postId
                          ]
                            ? "Show fewer comments"
                            : "View all " +
                              post.comments.length +
                              " comments"}
                        </button>
                      )}

                      {Array.isArray(post.comments) &&
                        post.comments.length > 0 && (
                        <div className="post-comments-list">
                          {(expandedComments[
                            postId
                          ]
                            ? post.comments
                            : post.comments.slice(-3)
                          ).map((comment, commentIndex) => {
                            const commentId =
                              comment._id?.toString();

                            const commentMenuId =
                              "comment-" +
                              postId +
                              "-" +
                              (commentId ||
                                String(commentIndex));

                            const canDeleteThisComment =
                              canModerate &&
                              (
                                isMainAdmin(username) ||
                                !isMainAdmin(
                                  comment?.username
                                )
                              );

                            const commentKey =
                              commentId ||
                              String(comment.username) +
                                "-" +
                                String(comment.createdAt) +
                                "-" +
                                String(commentIndex);

                            return (
                              <div
                                className="post-comment"
                                key={commentKey}
                                style={{
                                  position: "relative",
                                }}
                              >
                                <div className="post-comment-user">
                                  {comment.profileImage ? (
                                    <img
                                      src={comment.profileImage}
                                      alt={comment.username}
                                      className="post-comment-avatar"
                                    />
                                  ) : (
                                    <div className="post-comment-avatar post-comment-avatar-fallback">
                                      {"\u{1F464}"}
                                    </div>
                                  )}

                                  <strong>
                                    {comment.username}
                                  </strong>

                                  {canDeleteThisComment && (
                                    <div
                                      className="home-moderation-wrapper"
                                      style={{
                                        marginLeft: "auto",
                                        position: "relative",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        aria-label="Comment moderation menu"
                                        onClick={(event) => {
                                          event.stopPropagation();

                                          toggleModerationMenu(
                                            commentMenuId
                                          );
                                        }}
                                        style={{
                                          border: "none",
                                          background: "transparent",
                                          fontSize: "20px",
                                          cursor: "pointer",
                                          padding: "1px 6px",
                                          lineHeight: 1,
                                        }}
                                      >
                                        {"\u22EE"}
                                      </button>

                                      {openModerationMenu ===
                                        commentMenuId && (
                                        <div
                                          className="home-moderation-menu"
                                          onClick={(event) =>
                                            event.stopPropagation()
                                          }
                                          style={{
                                            position: "absolute",
                                            right: 0,
                                            top: "28px",
                                            zIndex: 1000,
                                            minWidth: "230px",
                                            background: "#fff",
                                            border: "1px solid #ddd",
                                            borderRadius: "10px",
                                            boxShadow:
                                              "0 5px 18px rgba(0,0,0,0.18)",
                                            padding: "6px",
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleAdminDeleteComment(
                                                post,
                                                comment,
                                                false
                                              )
                                            }
                                            style={{
                                              display: "block",
                                              width: "100%",
                                              textAlign: "left",
                                              border: "none",
                                              background: "transparent",
                                              padding: "10px",
                                              cursor: "pointer",
                                              borderRadius: "7px",
                                            }}
                                          >
                                            {"\u{1F5D1}\uFE0F"} Delete Comment
                                          </button>

                                          {!isMainAdmin(
                                            comment?.username
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleAdminDeleteComment(
                                                  post,
                                                  comment,
                                                  true
                                                )
                                              }
                                              style={{
                                                display: "block",
                                                width: "100%",
                                                textAlign: "left",
                                                border: "none",
                                                background: "transparent",
                                                padding: "10px",
                                                cursor: "pointer",
                                                borderRadius: "7px",
                                              }}
                                            >
                                              {"\u{1F6AB}"} Delete & Block User
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="post-comment-text">
                                  {comment.text}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="post-time">
                      {post.createdAt
                        ? new Date(
                            post.createdAt
                          ).toLocaleString()
                        : ""}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="features">
            <div className="card">
              <h3>
                {"\u{1F4AC}"} Public Chat
              </h3>
              <p>
                Talk with people and share your ideas.
              </p>
            </div>

            <div className="card">
              <h3>
                {"\u{1F465}"} Community
              </h3>
              <p>
                Meet new people and make connections.
              </p>
            </div>

            <div className="card">
              <h3>
                {"\u{1F4E2}"} Promotion
              </h3>
              <p>
                Share your business and services.
              </p>
            </div>
          </div>
        </main>

        <aside className="home-promotion-sidebar">
          <div className="home-promotion-header">
            {"\u2B50"} Featured Promotions
          </div>

          {promotions.length > 0 ? (
            <div className="home-promotion-list">
              {promotions.map(
                (promotion, index) => (
                  <div
                    className="home-promotion-card"
                    key={
                      promotion._id
                        ? String(promotion._id)
                        : index
                    }
                  >
                    {promotion.image ? (
                      <div className="home-promotion-image-wrapper">
                        <img
                          src={promotion.image}
                          alt={
                            promotion.title ||
                            "Promotion"
                          }
                          className="home-promotion-image"
                        />
                      </div>
                    ) : (
                      <div className="home-promotion-placeholder">
                        {"\u{1F5BC}"}
                      </div>
                    )}

                    <h3>
                      {promotion.title ||
                        "Promotion"}
                    </h3>

                    {promotion.promotionTitle && (
                      <p className="home-promotion-subtitle">
                        {promotion.promotionTitle}
                      </p>
                    )}

                    <p className="home-promotion-text">
                      {promotion.description ||
                        "No promotion description."}
                    </p>

                    {promotion.link && (
                      <button
                        type="button"
                        className="home-promotion-button"
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
            <div className="home-promotion-card home-no-promotion">
              <div className="home-promotion-placeholder">
                {"\u{1F5BC}"}
              </div>

              <h3>
                No Active Promotion
              </h3>

              <p className="home-promotion-text">
                Abhi koi active promotion
                available nahi hai.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Home;
