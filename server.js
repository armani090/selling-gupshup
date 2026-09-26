require("dotenv").config();

const { createServer } = require("http");
const { Server } = require("socket.io");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

function isMainAdminUsername(username) {
  return normalizeUsername(username).toLowerCase() === "armani";
}

function normalizeRole(role) {
  const value =
    typeof role === "string"
      ? role.trim().toLowerCase()
      : "";

  if (value === "admin" || value === "moderator") {
    return value;
  }

  return "user";
}
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST", "OPTIONS"]
}));

const uploadsDir = path.join(__dirname, "uploads");
const fs = require("fs");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName =
      Date.now() + "-" +
      Math.random().toString(36).slice(2) +
      ext;

    cb(null, safeName);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed."));
    }
  }
});

app.post(
  "/upload-video-status",
  uploadVideo.single("video"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video file nahi mili."
      });
    }

    const videoUrl =
      "/uploads/" +
      req.file.filename;

    res.json({
      success: true,
      videoUrl
    });
  }
);

const uploadPostMedia = multer({
  storage: videoStorage,
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype &&
      (
        file.mimetype.startsWith("image/") ||
        file.mimetype.startsWith("video/")
      )
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed."));
    }
  }
});

app.post(
  "/upload-post-media",
  uploadPostMedia.single("media"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image ya video file nahi mili."
      });
    }

    const mediaUrl =
      "/uploads/" +
      req.file.filename;

    const mediaType =
      req.file.mimetype.startsWith("image/")
        ? "image"
        : "video";

    res.json({
      success: true,
      mediaUrl,
      mediaType
    });
  }
);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==========================================
// MONGODB
// ==========================================

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("MONGODB_URI not found in .env file");
  process.exit(1);
}

const mongoClient = new MongoClient(mongoUri);

let db;
let messagesCollection;
let publicMessagesCollection;
let publicReportsCollection;
let promotionsCollection;
let usersCollection;
let postsCollection;
let passwordResetsCollection;

// ==========================================
// MONGODB CONNECTION
// ==========================================

async function connectMongoDB() {
  try {
    await mongoClient.connect();

    db = mongoClient.db("sellinggupshap");

    messagesCollection =
      db.collection("messages");

    publicMessagesCollection =
      db.collection("public_messages");

    publicReportsCollection =
      db.collection("public_reports");

    promotionsCollection =
      db.collection("promotions");

    usersCollection =
      db.collection("users");

    postsCollection =
      db.collection("posts");

    passwordResetsCollection =
      db.collection("password_resets");

    await passwordResetsCollection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    console.log(
      "MongoDB Atlas connected successfully"
    );

    await messagesCollection.createIndex({
      username: 1,
      to: 1,
      time: 1
    });

    await publicMessagesCollection.createIndex({
      createdAt: -1
    });

    await publicReportsCollection.createIndex({
      createdAt: -1
    });

    await promotionsCollection.createIndex({
      createdAt: -1
    });

    await usersCollection.createIndex(
      { username: 1 },
      { unique: true }
    );

    await usersCollection.createIndex(
      { email: 1 },
      { unique: true }
    );

    console.log(
      "Users collection and indexes ready"
    );

  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error
    );

    process.exit(1);
  }
}

// ==========================================
// ONLINE USERS
// ==========================================

const onlineUsers = {};

// ==========================================
// HELPERS
// ==========================================

function normalizeUsername(username) {
  if (typeof username !== "string") {
    return "";
  }

  return username.trim();
}

function normalizeEmail(email) {
  if (typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}

function getOnlineUserNames() {
  return Object.keys(onlineUsers);
}

function broadcastOnlineUsers() {
  io.emit(
    "online_users",
    getOnlineUserNames()
  );
}

// ==========================================
// ADMIN CHECK
// ==========================================

function isAdminUsername(username) {
  return (
    normalizeUsername(username).toLowerCase() ===
    "armani"
  );
}
// ==========================================
// USER ROLE HELPERS
// ==========================================

function getUserRole(user) {
  if (!user) return "user";

  const username = normalizeUsername(user.username || "").toLowerCase();

  if (username === "armani") return "superadmin";

  const role = typeof user.role === "string"
    ? user.role.trim().toLowerCase()
    : "user";

  if (role === "admin" || role === "moderator") {
    return role;
  }

  return "user";
}

function canManageUsers(user) {
  const role = getUserRole(user);
  return role === "superadmin" ||
         role === "admin" ||
         role === "moderator";
}

function canChangeRoles(user) {
  return getUserRole(user) === "superadmin";
}


// ==========================================
// PROMOTION HELPERS
// ==========================================

async function getApprovedPromotions() {
  if (!promotionsCollection) {
    return [];
  }

  return await promotionsCollection
    .find({
      approved: true,
      active: true
    })
    .sort({
      createdAt: -1
    })
    .toArray();
}

async function getPendingPromotions() {
  if (!promotionsCollection) {
    return [];
  }

  return await promotionsCollection
    .find({
      approved: false,
      status: "pending"
    })
    .sort({
      createdAt: -1
    })
    .toArray();
}

// ==========================================
// SEND ADMIN REPORTS
// ==========================================

async function sendAdminReports() {
  if (!publicReportsCollection) {
    return [];
  }

  const reports =
    await publicReportsCollection
      .find({})
      .sort({
        createdAt: -1
      })
      .toArray();

  io.emit(
    "admin_reports_data",
    reports
  );

  return reports;
}


// ==========================================
// USER MANAGEMENT HELPERS
// ==========================================

function isUserSuspended(user) {
  return !!(user && user.suspended === true);
}

function isUserBlocked(user) {
  return !!(user && user.blocked === true);
}

async function getUserByUsername(username) {
  if (!usersCollection) {
    return null;
  }

  const name = normalizeUsername(username);

  if (!name) {
    return null;
  }

  return await usersCollection.findOne({
    username: name
  });
}

async function isPrivateUserBlocked(blockerUsername, blockedUsername) {
  if (!usersCollection) {
    return false;
  }

  const blocker = await getUserByUsername(
    blockerUsername
  );

  if (!blocker || !Array.isArray(blocker.blockedUsers)) {
    return false;
  }

  return blocker.blockedUsers.some(
    (name) =>
      normalizeUsername(name) ===
      normalizeUsername(blockedUsername)
  );
}
async function sendUserManagementData() {
  if (!usersCollection) {
    return [];
  }

  const users = await usersCollection
    .find(
      {},
      {
        projection: {
          password: 0
        }
      }
    )
    .sort({
      createdAt: -1
    })
    .toArray();

  io.emit(
    "admin_users_data",
    users
  );

  return users;
}

function emitUserManagementError(socket, message) {
  socket.emit(
    "user_management_error",
    {
      success: false,
      message
    }
  );
}
// SOCKET CONNECTION
// ==========================================

const crypto = require("crypto");
const mailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

io.on("connection", (socket) => {


// ==========================================
// PRIVATE BLOCK STATUS
// ==========================================

socket.on("get_private_block_status", async (data) => {
  try {
    const username = normalizeUsername(data?.username);
    const otherUsername = normalizeUsername(data?.otherUsername);

    if (!username || !otherUsername) {
      return;
    }

    const blockedByMe = await isPrivateUserBlocked(
      username,
      otherUsername
    );

    const blockedMe = await isPrivateUserBlocked(
      otherUsername,
      username
    );

    socket.emit("private_block_status", {
      username: otherUsername,
      blockedByMe,
      blockedMe
    });

  } catch (error) {
    console.error(
      "PRIVATE BLOCK STATUS ERROR:",
      error
    );
  }
});

// ==========================================
// PRIVATE USER BLOCK / UNBLOCK
// ==========================================

socket.on("block_private_user", async (data) => {
  try {
    const blockerUsername = normalizeUsername(data?.username);
    const blockedUsername = normalizeUsername(data?.blockedUsername);

    if (!blockerUsername || !blockedUsername) {
      socket.emit("private_block_result", {
        success: false,
        action: "block",
        message: "Invalid user information."
      });
      return;
    }

    if (blockerUsername === blockedUsername) {
      socket.emit("private_block_result", {
        success: false,
        action: "block",
        message: "Aap khud ko block nahi kar sakte."
      });
      return;
    }

    const result = await usersCollection.updateOne(
      { username: blockerUsername },
      {
        $addToSet: {
          blockedUsers: blockedUsername
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      socket.emit("private_block_result", {
        success: false,
        action: "block",
        message: "User account nahi mila."
      });
      return;
    }

    console.log(
      "PRIVATE USER BLOCKED:",
      blockerUsername,
      "BLOCKED:",
      blockedUsername
    );

    socket.emit("private_block_result", {
      success: true,
      action: "block",
      blockedUsername
    });

  } catch (error) {
    console.error(
      "PRIVATE BLOCK ERROR:",
      error
    );

    socket.emit("private_block_result", {
      success: false,
      action: "block",
      message: "Block karte waqt error aa gaya."
    });
  }
});

socket.on("unblock_private_user", async (data) => {
  try {
    const blockerUsername = normalizeUsername(data?.username);
    const blockedUsername = normalizeUsername(data?.blockedUsername);

    if (!blockerUsername || !blockedUsername) {
      socket.emit("private_block_result", {
        success: false,
        action: "unblock",
        message: "Invalid user information."
      });
      return;
    }

    await usersCollection.updateOne(
      { username: blockerUsername },
      {
        $pull: {
          blockedUsers: blockedUsername
        },
        $set: {
          updatedAt: new Date()
        }
      }
    );

    console.log(
      "PRIVATE USER UNBLOCKED:",
      blockerUsername,
      "UNBLOCKED:",
      blockedUsername
    );

    socket.emit("private_block_result", {
      success: true,
      action: "unblock",
      blockedUsername
    });

  } catch (error) {
    console.error(
      "PRIVATE UNBLOCK ERROR:",
      error
    );

    socket.emit("private_block_result", {
      success: false,
      action: "unblock",
      message: "Unblock karte waqt error aa gaya."
    });
  }
});
// ==========================================


  console.log(
    "User connected:",
    socket.id
  );

    // ========================================
  // ADMIN USER MANAGEMENT
  // ========================================

  socket.on(
    "get_admin_users",
    async (data) => {
      try {

        const admin =
          normalizeUsername(
            data?.admin ||
            socket.username ||
            ""
          );

        const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
          emitUserManagementError(
            socket,
            "Sirf Armani users manage kar sakta hai."
          );
          return;
        }

        await sendUserManagementData();

      } catch (error) {

        console.error(
          "Get admin users error:",
          error
        );

        emitUserManagementError(
          socket,
          "Users list load nahi ho saki."
        );
      }
    }
  );

  const updateUserManagement = async (data) => {
    try {

      const admin =
        normalizeUsername(
          data?.admin ||
          socket.username ||
          ""
        );

      const adminUser =
        await getUserByUsername(admin);

      const adminRole =
        admin.toLowerCase() === "armani"
          ? "main_admin"
          : (
              typeof adminUser?.role === "string"
                ? adminUser.role.toLowerCase()
                : "user"
            );

      const isMainAdmin =
        admin.toLowerCase() === "armani";

      const canManageUsers =
        isMainAdmin ||
        adminRole === "admin" ||
        adminRole === "moderator";

      if (!canManageUsers) {
        emitUserManagementError(
          socket,
          "Sirf Admin ya Moderator users manage kar sakta hai."
        );
        return;
      }

      const username =
        normalizeUsername(
          data?.username ||
          ""
        );

      const action =
        typeof data?.action === "string"
          ? data.action.trim().toLowerCase()
          : "";

      if (!username || !action) {
        emitUserManagementError(
          socket,
          "Username aur action zaroori hain."
        );
        return;
      }

      if (
        username.toLowerCase() === "armani"
      ) {
        emitUserManagementError(
          socket,
          "Main Admin ko manage nahi kiya ja sakta."
        );
        return;
      }

      const user =
        await getUserByUsername(username);

      if (!user) {
        emitUserManagementError(
          socket,
          "User nahi mila."
        );
        return;
      }

      const targetRole =
        typeof user.role === "string"
          ? user.role.toLowerCase()
          : "user";

      const roleActions = [
        "make_admin",
        "make_moderator",
        "remove_role"
      ];

      const managementActions = [
        "suspend",
        "unsuspend",
        "block",
        "unblock"
      ];

      if (
        roleActions.includes(action)
      ) {

        if (!isMainAdmin) {
          emitUserManagementError(
            socket,
            "Sirf Main Admin roles change kar sakta hai."
          );
          return;
        }

      } else if (
        managementActions.includes(action)
      ) {

        if (
          !isMainAdmin &&
          (
            targetRole === "admin" ||
            targetRole === "moderator"
          )
        ) {
          emitUserManagementError(
            socket,
            "Admin ya Moderator ko sirf Main Admin manage kar sakta hai."
          );
          return;
        }

      } else {

        emitUserManagementError(
          socket,
          "Invalid user management action."
        );
        return;
      }

      const update = {
        updatedAt:
          new Date()
      };

      if (action === "suspend") {
        update.suspended = true;
      }

      if (action === "unsuspend") {
        update.suspended = false;
      }

      if (action === "block") {
        update.blocked = true;
      }

      if (action === "unblock") {
        update.blocked = false;
      }

      if (action === "make_admin") {
        update.role = "admin";
      }

      if (action === "make_moderator") {
        update.role = "moderator";
      }

      if (action === "remove_role") {
        update.role = "user";
      }

      const result =
        await usersCollection.findOneAndUpdate(
          {
            _id:
              user._id
          },
          {
            $set:
              update
          },
          {
            returnDocument:
              "after",
            projection: {
              password: 0
            }
          }
        );

      if (!result) {
        emitUserManagementError(
          socket,
          "User update nahi ho saka."
        );
        return;
      }

      console.log(
        "USER MANAGEMENT:",
        username,
        action,
        "BY:",
        admin,
        "ROLE:",
        update.role || targetRole
      );

      io.emit(
        "user_management_updated",
        result
      );

      await sendUserManagementData();

      socket.emit(
        "user_management_success",
        {
          success: true,
          action,
          user: result
        }
      );

      const targetSocketId =
        onlineUsers[username];

      if (
        targetSocketId &&
        roleActions.includes(action)
      ) {
        io.to(
          targetSocketId
        ).emit(
          "role_updated",
          {
            username,
            role:
              update.role || "user",
            message:
              "Aapka role update kar diya gaya hai. Please logout karke dobara login karein."
          }
        );
      }

      if (
        targetSocketId &&
        (
          action === "suspend" ||
          action === "block"
        )
      ) {
        io.to(
          targetSocketId
        ).emit(
          "account_restricted",
          {
            action,
            message:
              action === "suspend"
                ? "Admin ne aapka account suspend kar diya hai."
                : "Admin ne aapka account block kar diya hai."
          }
        );
      }

    } catch (error) {

      console.error(
        "Update user management error:",
        error
      );

      emitUserManagementError(
        socket,
        "User update nahi ho saka."
      );
    }
  };
  socket.on(
    "update_user_management",
    updateUserManagement
  );
// ========================================
  // REGISTER USER
  // ========================================

  socket.on(
    "register_user",
    async (data) => {
      try {

        if (!data) {
          socket.emit(
            "register_result",
            {
              success: false,
              message:
                "Registration data missing."
            }
          );

          return;
        }

        const username =
          normalizeUsername(
            data.username
          );

        const email =
          normalizeEmail(
            data.email
          );

        const password =
          typeof data.password === "string"
            ? data.password
            : "";

        if (
          !username ||
          !email ||
          !password
        ) {
          socket.emit(
            "register_result",
            {
              success: false,
              message:
                "Username, email aur password zaroori hain."
            }
          );

          return;
        }

        if (password.length < 6) {
          socket.emit(
            "register_result",
            {
              success: false,
              message:
                "Password kam az kam 6 characters ka hona chahiye."
            }
          );

          return;
        }

        if (!usersCollection) {
          socket.emit(
            "register_result",
            {
              success: false,
              message:
                "Users database available nahi hai."
            }
          );

          return;
        }

        const existingUser =
          await usersCollection.findOne({
            $or: [
              { username: username },
              { email: email }
            ]
          });

        if (existingUser) {

          if (
            existingUser.username &&
            existingUser.username.toLowerCase() ===
              username.toLowerCase()
          ) {
            socket.emit(
              "register_result",
              {
                success: false,
                message:
                  "Ye username pehle se registered hai."
              }
            );

            return;
          }

          if (
            existingUser.email &&
            existingUser.email.toLowerCase() ===
              email.toLowerCase()
          ) {
            socket.emit(
              "register_result",
              {
                success: false,
                message:
                  "Ye email pehle se registered hai."
              }
            );

            return;
          }
        }

        const hashedPassword =
          await bcrypt.hash(
            password,
            12
          );

        const newUser = {
          username,
          email,
          password: hashedPassword,

          bio:
            "Welcome to Selling GupShup",

          profileImage: "",

          videoStatus: "",

          createdAt:
            new Date(),

          updatedAt:
            new Date()
        };

        const result =
          await usersCollection.insertOne(
            newUser
          );

        console.log(
          "USER REGISTERED:",
          username,
          email
        );

        socket.emit(
          "register_result",
          {
            success: true,

            message:
              "Account successfully create ho gaya.",

            user: {
              id:
                result.insertedId.toString(),

              username,

              email
            }
          }
        );

      } catch (error) {

        console.error(
          "Register error:",
          error
        );

        if (
          error &&
          error.code === 11000
        ) {
          socket.emit(
            "register_result",
            {
              success: false,
              message:
                "Username ya email already registered hai."
            }
          );

          return;
        }

        socket.emit(
          "register_result",
          {
            success: false,
            message:
              "Registration nahi ho saki."
          }
        );
      }
    }
  );

  // ========================================
  // LOGIN USER
  // ========================================

  socket.on(
    "login_user",
    async (data) => {
      try {

        if (!data) {
          socket.emit(
            "login_result",
            {
              success: false,
              message:
                "Login data missing."
            }
          );

          return;
        }

        const email =
          normalizeEmail(
            data.email
          );

        const password =
          typeof data.password === "string"
            ? data.password
            : "";

        if (!email || !password) {
          socket.emit(
            "login_result",
            {
              success: false,
              message:
                "Email aur password enter karein."
            }
          );

          return;
        }

        if (!usersCollection) {
          socket.emit(
            "login_result",
            {
              success: false,
              message:
                "Users database available nahi hai."
            }
          );

          return;
        }

        const user =
          await usersCollection.findOne({
            email
          });

        if (!user) {
          socket.emit(
            "login_result",
            {
              success: false,
              message:
                "Email ya password ghalat hai."
            }
          );

          return;
        }

        const passwordCorrect =
          await bcrypt.compare(
            password,
            user.password
          );

        if (!passwordCorrect) {
          socket.emit(
            "login_result",
            {
              success: false,
              message:
                "Email ya password ghalat hai."
            }
          );

          return;
        }

        const effectiveRole = (user.username && user.username.toLowerCase() === "armani") ? "main_admin" : ((typeof user.role === "string" && (user.role.toLowerCase() === "admin" || user.role.toLowerCase() === "moderator")) ? user.role.toLowerCase() : "user");

        console.log(
          "USER LOGIN SUCCESS:",
          user.username,
          "ROLE:",
          effectiveRole
        );

        socket.username =
          user.username;

        socket.emit(
          "login_result",
          {
            success: true,

            message:
              "Login successful.",

            user: {
              id:
                user._id.toString(),

              username:
                user.username,

              email:
                user.email,

              
              role:
                effectiveRole,
bio:
                user.bio ||
                "Welcome to Selling GupShup",

              profileImage:
                user.profileImage ||
                "",

              videoStatus:
                user.videoStatus ||
                ""
            }
          }
        );

      } catch (error) {

        console.error(
          "Login error:",
          error
        );

        socket.emit(
          "login_result",
          {
            success: false,
            message:
              "Login nahi ho saka."
          }
        );
      }
    }
  );

  // ========================================
  // GET USER PROFILE
  // ========================================

  socket.on(
    "get_user_profile",
    async (data) => {

      try {

        if (
          !data ||
          !data.username
        ) {
          return;
        }

        const username =
          normalizeUsername(
            data.username
          );

        if (!username) {
          return;
        }

        const user =
          await usersCollection.findOne(
            { username },
            {
              projection: {
                password: 0
              }
            }
          );

        if (!user) {
          socket.emit(
            "user_profile_result",
            {
              success: false,
              message:
                "User nahi mila."
            }
          );

          return;
        }

        socket.emit(
          "user_profile_result",
          {
            success: true,
            user
          }
        );

      } catch (error) {

        console.error(
          "Get profile error:",
          error
        );
      }
    }
  );

  // ========================================
  // UPDATE USER PROFILE
  // ========================================

  socket.on("update_user_profile", async (data) => {

      console.log("PROFILE UPDATE RECEIVED:", data);

      try {

        if (
          !data ||
          !data.username
        ) {
          return;
        }

        const username =
          normalizeUsername(
            data.username
          );

        if (!username) {
          return;
        }

        const update = {
          updatedAt:
            new Date()
        };

        if (
          typeof data.bio ===
          "string"
        ) {
          update.bio =
            data.bio;
        }

        if (
          typeof data.profileImage ===
          "string"
        ) {
          update.profileImage =
            data.profileImage;
        }

        if (
          typeof data.videoStatus ===
          "string"
        ) {
          update.videoStatus =
            data.videoStatus;
        }

        const result =
          await usersCollection.findOneAndUpdate(
            {
              username
            },
            {
              $set: update
            },
            {
              returnDocument:
                "after",
              projection: {
                password: 0
              }
            }
          );

        if (!result) {
          socket.emit(
            "profile_update_result",
            {
              success: false,
              message:
                "Profile update nahi hui."
            }
          );

          return;
        }

        socket.emit(
          "profile_update_result",
          {
            success: true,
            user: result
          }
        );

      } catch (error) {

        console.error(
          "Profile update error:",
          error
        );
      }
    }
  );

  // ========================================
  // USER JOIN
  // ========================================

  socket.on(
    "join_chat",
    (username) => {

      console.log(
        "JOIN EVENT RECEIVED:",
        username
      );

      let name = username;

      if (
        username &&
        typeof username === "object"
      ) {
        name =
          username.username;
      }

      name =
        normalizeUsername(
          name
        );

      if (!name) {
        return;
      }

      onlineUsers[name] =
        socket.id;

      socket.username =
        name;

      console.log(
        name +
          " joined the chat"
      );

      broadcastOnlineUsers();
    }
  );

  // ========================================
  // PRIVATE MESSAGE
  // ========================================

  socket.on(
    "send_private_message",
    async (newMessage) => {

      console.log(
        "SEND MESSAGE EVENT RECEIVED"
      );

      const senderUser = await getUserByUsername(
        newMessage?.username
      );
if (
        senderUser?.suspended ||
        senderUser?.blocked
      ) {
        console.log(
          "PRIVATE MESSAGE BLOCKED - USER SUSPENDED/BLOCKED:",
          newMessage.username
        );
        return;
      }

      const senderBlockedTarget =
        await isPrivateUserBlocked(
          newMessage.username,
          newMessage.to
        );

      const targetBlockedSender =
        await isPrivateUserBlocked(
          newMessage.to,
          newMessage.username
        );

      if (
        senderBlockedTarget ||
        targetBlockedSender
      ) {
        console.log(
          "PRIVATE MESSAGE BLOCKED - PRIVATE USER BLOCK:",
          newMessage.username,
          "->",
          newMessage.to
        );

        socket.emit(
          "private_message_blocked",
          {
            to: newMessage.to,
            message:
              "Private chat blocked hai. Message send nahi ho sakta."
          }
        );

        return;
      }


      if (
        !newMessage ||
        !newMessage.username ||
        !newMessage.to
      ) {
        console.log(
          "Invalid private message"
        );

        return;
      }

      console.log(
        "PRIVATE MESSAGE:",
        newMessage.username,
        "->",
        newMessage.to + ":",
        newMessage.message ||
          (
            newMessage.image
              ? "IMAGE"
              : "VOICE"
          )
      );

      try {

        if (messagesCollection) {

          await messagesCollection.insertOne({
            username:
              newMessage.username,

            to:
              newMessage.to,

            message:
              newMessage.message ||
              "",

            image:
              newMessage.image ||
              "",

            audio:
              newMessage.audio ||
              "",

            time:
              newMessage.time ||
              "",

            createdAt:
              new Date()
          });

          console.log(
            "MESSAGE SAVED TO MONGODB"
          );
        }

      } catch (error) {

        console.error(
          "MongoDB save error:",
          error
        );
      }

      const receiverSocketId =
        onlineUsers[
          newMessage.to
        ];

      if (receiverSocketId) {

        io.to(
          receiverSocketId
        ).emit(
          "receive_private_message",
          newMessage
        );

        console.log(
          "PRIVATE MESSAGE SENT TO:",
          newMessage.to
        );

      } else {

        console.log(
          "USER OFFLINE:",
          newMessage.to
        );
      }
    }
  );

  // ========================================
  // GET PRIVATE CHAT HISTORY
  // ========================================

  socket.on(
    "get_private_messages",
    async (data) => {

      try {

        if (
          !data ||
          !data.username ||
          !data.to
        ) {
          return;
        }

        const username =
          data.username;

        const to =
          data.to;

        const history =
          await messagesCollection
            .find({
              $or: [
                {
                  username,
                  to
                },
                {
                  username: to,
                  to: username
                }
              ]
            })
            .sort({
              createdAt: 1
            })
            .toArray();

        socket.emit(
          "private_messages_history",
          history
        );

      } catch (error) {

        console.error(
          "Private history error:",
          error
        );
      }
    }
  );

  // ========================================
  // PUBLIC MESSAGE
  // ========================================

  socket.on(
    "send_public_message",
    async (newMessage) => {

      try {

        const senderUser = await getUserByUsername(
          newMessage?.username
        );
if (
          senderUser?.suspended ||
          senderUser?.blocked
        ) {
          console.log(
            "PUBLIC MESSAGE BLOCKED - USER SUSPENDED/BLOCKED:",
            newMessage.username
          );
          return;
        }

        if (
          !newMessage ||
          !newMessage.username
        ) {
          return;
        }

        const publicMessage = {

          username:
            newMessage.username,

          message:
            newMessage.message ||
            "",

          image:
            newMessage.image ||
            "",

          audio:
            newMessage.audio ||
            "",

          time:
            newMessage.time ||
            "",

          createdAt:
            new Date()
        };

        if (
          publicMessagesCollection
        ) {

          const result =
            await publicMessagesCollection.insertOne(
              publicMessage
            );

          publicMessage._id =
            result.insertedId;
        }

        io.emit(
          "receive_public_message",
          publicMessage
        );

      } catch (error) {

        console.error(
          "Public message error:",
          error
        );
      }
    }
  );

  // ========================================
  // GET PUBLIC CHAT HISTORY
  // ========================================

  socket.on(
    "get_public_messages",
    async () => {

      try {

        if (
          !publicMessagesCollection
        ) {
          return;
        }

        const messages =
          await publicMessagesCollection
            .find({})
            .sort({
              createdAt: 1
            })
            .limit(300)
            .toArray();

        socket.emit(
          "public_messages_history",
          messages
        );
      } catch (error) {

        console.error(
          "Public history error:",
          error
        );
      }
    }
  );

  // ========================================
  // CREATE HOME POST
  // ========================================

  socket.on(
    "create_post",
    async (postData) => {

      try {

        const username =
          postData?.username?.trim();

        const content =
          postData?.content?.trim() || "";

        const mediaUrl =
          postData?.mediaUrl?.trim() || "";

        const mediaType =
          postData?.mediaType || "";

        if (!username || (!content && !mediaUrl)) {
          return;
        }

        const senderUser =
          await getUserByUsername(username);

        if (
          senderUser?.suspended ||
          senderUser?.blocked
        ) {
          console.log(
            "POST BLOCKED - USER SUSPENDED/BLOCKED:",
            username
          );
          return;
        }

        const post = {
          username: username,
          content: content,
          mediaUrl: mediaUrl,
          mediaType: mediaType,
          profileImage: senderUser?.profileImage || "",
          createdAt: new Date()
        };

        if (postsCollection) {

          const result =
            await postsCollection.insertOne(post);

          post._id =
            result.insertedId;
        }

        io.emit(
          "new_post",
          post
        );

      } catch (error) {

        console.error(
          "Create post error:",
          error
        );
      }
    }
  );


  // LIKE / UNLIKE HOME POST
  socket.on("like_post", async (data) => {
    try {
      const postId = data?.postId;
      const username = data?.username?.trim();

      if (!postId || !username || !postsCollection) return;

      const { ObjectId } = require("mongodb");
      const _id = new ObjectId(postId);

      const post = await postsCollection.findOne({ _id });
      if (!post) return;

      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
      const alreadyLiked = likedBy.includes(username);

      const updatedLikedBy = alreadyLiked
        ? likedBy.filter((name) => name !== username)
        : [...likedBy, username];

      await postsCollection.updateOne(
        { _id },
        {
          $set: {
            likedBy: updatedLikedBy,
            likes: updatedLikedBy.length
          }
        }
      );

      io.emit("post_liked", {
        postId: postId,
        likedBy: updatedLikedBy,
        likes: updatedLikedBy.length
      });

      console.log(
        alreadyLiked ? "POST UNLIKED:" : "POST LIKED:",
        username,
        postId
      );

    } catch (error) {
      console.error("Like post error:", error);
    }
  });

  // POST REACTIONS
  socket.on("post_reaction", async (data) => {
    try {
      const postId = data?.postId;
      const username = data?.username?.trim();
      const reaction = data?.reaction;

      if (!postId || !username || !postsCollection) return;

      if (!["like", "love", "dislike"].includes(reaction)) return;

      const { ObjectId } = require("mongodb");
      const _id = new ObjectId(postId);

      const post = await postsCollection.findOne({ _id });
      if (!post) return;

      let likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
      let loveBy = Array.isArray(post.loveBy) ? post.loveBy : [];
      let dislikeBy = Array.isArray(post.dislikeBy) ? post.dislikeBy : [];

      likedBy = likedBy.filter((name) => name !== username);
      loveBy = loveBy.filter((name) => name !== username);
      dislikeBy = dislikeBy.filter((name) => name !== username);

      const oldReaction =
        (Array.isArray(post.likedBy) && post.likedBy.includes(username)) ? "like" :
        (Array.isArray(post.loveBy) && post.loveBy.includes(username)) ? "love" :
        (Array.isArray(post.dislikeBy) && post.dislikeBy.includes(username)) ? "dislike" :
        null;

      if (oldReaction !== reaction) {
        if (reaction === "like") likedBy.push(username);
        if (reaction === "love") loveBy.push(username);
        if (reaction === "dislike") dislikeBy.push(username);
      }

      await postsCollection.updateOne(
        { _id },
        {
          $set: {
            likedBy: likedBy,
            likes: likedBy.length,
            loveBy: loveBy,
            loves: loveBy.length,
            dislikeBy: dislikeBy,
            dislikes: dislikeBy.length
          }
        }
      );

      io.emit("post_reacted", {
        postId: postId,
        likedBy: likedBy,
        likes: likedBy.length,
        loveBy: loveBy,
        loves: loveBy.length,
        dislikeBy: dislikeBy,
        dislikes: dislikeBy.length
      });

      console.log("POST REACTION:", username, reaction, postId);

    } catch (error) {
      console.error("Post reaction error:", error);
    }
  });


  // ========================================
  // POST COMMENTS
  // ========================================

  socket.on("add_post_comment", async (data) => {
    try {
      const postId = data?.postId;
      const username = data?.username?.trim();
      const commentText = data?.comment?.trim();

      if (!postId || !username || !commentText || !postsCollection) {
        return;
      }

      const senderUser = await getUserByUsername(username);

      if (
        senderUser?.suspended ||
        senderUser?.blocked
      ) {
        console.log(
          "COMMENT BLOCKED - USER SUSPENDED/BLOCKED:",
          username
        );
        return;
      }

      const { ObjectId } = require("mongodb");
      const _id = new ObjectId(postId);

      const post = await postsCollection.findOne({ _id });

      if (!post) {
        return;
      }

      const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

      const commentUser = await getUserByUsername(username);

      console.log(
        "COMMENT USER PROFILE IMAGE:",
        username,
        commentUser?.profileImage
          ? "IMAGE FOUND"
          : "NO IMAGE FOUND"
      );

      const newComment = {
        _id: new ObjectId(),
        username: username,
        profileImage: commentUser?.profileImage || "",
        text: commentText,
        createdAt: new Date()
      };

      comments.push(newComment);

      await postsCollection.updateOne(
        { _id },
        {
          $set: {
            comments: comments
          }
        }
      );

      io.emit("post_commented", {
        postId: postId,
        comments: comments
      });

      console.log(
        "POST COMMENT:",
        username,
        postId
      );

    } catch (error) {
      console.error(
        "Add post comment error:",
        error
      );
    }
  });
  // ========================================
  // GET HOME POSTS
  socket.on("get_posts", async () => {
    try {
      if (!postsCollection) return;

      const posts =
        await postsCollection
          .find({})
          .sort({ createdAt: -1 })
          .limit(100)
          .toArray();

      const postsWithProfiles =
        await Promise.all(
          posts.map(async (post) => {
            const postUser =
              await getUserByUsername(post.username);

            return {
              ...post,
              profileImage:
                postUser?.profileImage ||
                post.profileImage ||
                ""
            };
          })
        );

      socket.emit(
        "posts_history",
        postsWithProfiles
      );

    } catch (error) {
      console.error(
        "Posts history error:",
        error
      );
    }
  });
  // ADMIN GET POSTS
  // ========================================

  socket.on("get_admin_posts", async (data) => {
    try {
      const admin = normalizeUsername(
        data?.admin ||
        socket.username ||
        ""
      );

      const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
        console.log(
          "GET ADMIN POSTS DENIED:",
          admin
        );
        return;
      }

      if (!postsCollection) {
        return;
      }

      const posts = await postsCollection
        .find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray();

      socket.emit(
        "admin_posts_data",
        posts
      );

      console.log(
        "ADMIN POSTS SENT:",
        posts.length
      );

    } catch (error) {
      console.error(
        "Get admin posts error:",
        error
      );
    }
  });

  // ========================================
  // ADMIN DELETE POST
  // ========================================

  socket.on("admin_delete_post", async (data) => {
    try {

      const admin = normalizeUsername(
        data?.admin ||
        socket.username ||
        ""
      );

      const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
        console.log(
          "ADMIN DELETE POST DENIED:",
          admin
        );

        socket.emit(
          "admin_post_delete_error",
          {
            success: false,
            message: "Aapko post delete karne ki permission nahi hai."
          }
        );

        return;
      }

      if (!postsCollection) {
        return;
      }

      const postId = String(data?.postId || "");
      const blockUser = data?.blockUser === true;

      if (!postId) {
        socket.emit(
          "admin_post_delete_error",
          {
            success: false,
            message: "Post ID missing hai."
          }
        );

        return;
      }

      let postObjectId;

      try {
        postObjectId = new ObjectId(postId);
      } catch (idError) {
        socket.emit(
          "admin_post_delete_error",
          {
            success: false,
            message: "Post ID invalid hai."
          }
        );

        return;
      }

      const post = await postsCollection.findOne({
        _id: postObjectId
      });

      if (!post) {
        socket.emit(
          "admin_post_delete_error",
          {
            success: false,
            message: "Post nahi mili ya pehle hi delete ho chuki hai."
          }
        );

        return;
      }

      const actorRole = isMainAdminUsername(admin) ? "main_admin" : normalizeRole(actor.role)

      const postOwner = normalizeUsername(
        post?.username || ""
      );

      if (isMainAdminUsername(postOwner) && actorRole !== "main_admin") {
        socket.emit("admin_post_delete_error", {
          success: false,
          message: "Main Admin ki post ko sirf Main Admin delete kar sakta hai."
        });
        return;
      }

      const result = await postsCollection.deleteOne({
        _id: postObjectId
      });

      if (result.deletedCount === 0) {
        socket.emit(
          "admin_post_delete_error",
          {
            success: false,
            message: "Post nahi mili ya pehle hi delete ho chuki hai."
          }
        );

        return;
      }

      let userBlocked = false;

      if (
        blockUser &&
        postOwner &&
        !isAdminUsername(postOwner) &&
        usersCollection
      ) {
        const user = await getUserByUsername(postOwner);

        if (user) {
          await usersCollection.updateOne(
            {
              _id: user._id
            },
            {
              $set: {
                blocked: true,
                updatedAt: new Date()
              }
            }
          );

          userBlocked = true;

          console.log(
            "USER BLOCKED AFTER POST DELETE:",
            postOwner,
            "BY:",
            admin
          );

          io.emit(
            "user_management_updated",
            {
              ...user,
              blocked: true,
              password: undefined,
              updatedAt: new Date()
            }
          );

          await sendUserManagementData();

          const targetSocketId =
            onlineUsers[postOwner];

          if (targetSocketId) {
            io.to(
              targetSocketId
            ).emit(
              "account_restricted",
              {
                action: "block",
                message:
                  "Admin ne aapka account block kar diya hai."
              }
            );
          }
        }
      }

      console.log(
        "POST SUCCESSFULLY DELETED BY ADMIN:",
        admin,
        postId,
        userBlocked
          ? `AND USER BLOCKED: ${postOwner}`
          : ""
      );

      io.emit(
        "post_deleted",
        {
          postId: postId
        }
      );

      socket.emit(
        "admin_post_delete_success",
        {
          success: true,
          deletedId: postId,
          userBlocked: userBlocked
        }
      );

    } catch (error) {

      console.error(
        "Admin delete post error:",
        error
      );

      socket.emit(
        "admin_post_delete_error",
        {
          success: false,
          message: "Post delete karte waqt error aa gaya."
        }
      );
    }
  });
  // ========================================
  // ADMIN DELETE POST COMMENT
  // ========================================

  socket.on("admin_delete_post_comment", async (data) => {
    try {

      const admin = normalizeUsername(
        data?.admin ||
        socket.username ||
        ""
      );

      const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
        console.log(
          "ADMIN DELETE COMMENT DENIED:",
          admin
        );

        socket.emit(
          "admin_comment_delete_error",
          {
            success: false,
            message: "Aapko comment delete karne ki permission nahi hai."
          }
        );

        return;
      }

      if (!postsCollection) {
        return;
      }

      const postId = String(data?.postId || "");
      const commentId = String(data?.commentId || "");
      const blockUser = data?.blockUser === true;

      if (!postId || !commentId) {
        socket.emit(
          "admin_comment_delete_error",
          {
            success: false,
            message: "Post ID ya Comment ID missing hai."
          }
        );

        return;
      }

      let postObjectId;
      let commentObjectId;

      try {
        postObjectId = new ObjectId(postId);
        commentObjectId = new ObjectId(commentId);
      } catch (idError) {
        socket.emit(
          "admin_comment_delete_error",
          {
            success: false,
            message: "Post ID ya Comment ID invalid hai."
          }
        );

        return;
      }

      const post = await postsCollection.findOne({
        _id: postObjectId
      });

      if (!post) {
        socket.emit(
          "admin_comment_delete_error",
          {
            success: false,
            message: "Post nahi mili."
          }
        );

        return;
      }

      const comments = Array.isArray(post.comments)
        ? post.comments
        : [];

      const comment = comments.find(
        (item) =>
          String(item?._id) === commentId
      );

      if (!comment) {
        socket.emit(
          "admin_comment_delete_error",
          {
            success: false,
            message: "Comment nahi mila ya pehle hi delete ho chuka hai."
          }
        );

        return;
      }

      const actorRole = isMainAdminUsername(admin) ? "main_admin" : normalizeRole(actor.role)

      const commentOwner = normalizeUsername(
        comment?.username || ""
      );

      if (isMainAdminUsername(commentOwner) && actorRole !== "main_admin") {
        socket.emit("admin_comment_delete_error", {
          success: false,
          message: "Main Admin ka comment sirf Main Admin delete kar sakta hai."
        });
        return;
      }

      const updatedComments = comments.filter(
        (item) =>
          String(item?._id) !== commentId
      );

      await postsCollection.updateOne(
        {
          _id: postObjectId
        },
        {
          $set: {
            comments: updatedComments
          }
        }
      );

      let userBlocked = false;

      if (
        blockUser &&
        commentOwner &&
        !isAdminUsername(commentOwner) &&
        usersCollection
      ) {
        const user = await getUserByUsername(commentOwner);

        if (user) {
          await usersCollection.updateOne(
            {
              _id: user._id
            },
            {
              $set: {
                blocked: true,
                updatedAt: new Date()
              }
            }
          );

          userBlocked = true;

          console.log(
            "USER BLOCKED AFTER COMMENT DELETE:",
            commentOwner,
            "BY:",
            admin
          );

          io.emit(
            "user_management_updated",
            {
              ...user,
              blocked: true,
              password: undefined,
              updatedAt: new Date()
            }
          );

          await sendUserManagementData();

          const targetSocketId =
            onlineUsers[commentOwner];

          if (targetSocketId) {
            io.to(
              targetSocketId
            ).emit(
              "account_restricted",
              {
                action: "block",
                message:
                  "Admin ne aapka account block kar diya hai."
              }
            );
          }
        }
      }

      console.log(
        "COMMENT SUCCESSFULLY DELETED BY ADMIN:",
        admin,
        postId,
        commentId,
        userBlocked
          ? `AND USER BLOCKED: ${commentOwner}`
          : ""
      );

      io.emit(
        "post_comment_deleted",
        {
          postId: postId,
          commentId: commentId,
          comments: updatedComments
        }
      );

      socket.emit(
        "admin_comment_delete_success",
        {
          success: true,
          postId: postId,
          deletedId: commentId,
          userBlocked: userBlocked
        }
      );

    } catch (error) {

      console.error(
        "Admin delete comment error:",
        error
      );

      socket.emit(
        "admin_comment_delete_error",
        {
          success: false,
          message: "Comment delete karte waqt error aa gaya."
        }
      );
    }
  });
  // ========================================

  socket.on(
    "report_public_message",
    async (report) => {

      try {

        console.log(
          "===================================="
        );

        console.log(
          "REPORT PUBLIC MESSAGE RECEIVED:",
          report
        );

        console.log(
          "===================================="
        );

        if (!report) {
          console.log(
            "REPORT ERROR: data missing"
          );

          return;
        }

        const reporter =
          normalizeUsername(
            report.username ||
            report.reporter ||
            ""
          );

        const messageId =
          report.messageId ||
          report._id ||
          report.message_id ||
          "";

        const messageOwner =
          normalizeUsername(
            report.messageUsername ||
            report.messageOwner ||
            report.reportedUsername ||
            ""
          );

        const message =
          typeof report.message ===
          "string"
            ? report.message
            : "";

        const reason =
          typeof report.reason ===
          "string" &&
          report.reason.trim()
            ? report.reason.trim()
            : "No reason provided";

        if (!reporter) {

          console.log(
            "REPORT ERROR: reporter missing"
          );

          socket.emit(
            "report_error",
            {
              message:
                "Reporter username missing."
            }
          );

          return;
        }

        if (!messageId) {

          console.log(
            "REPORT ERROR: messageId missing"
          );

          socket.emit(
            "report_error",
            {
              message:
                "Message ID missing."
            }
          );

          return;
        }

        if (
          messageOwner &&
          reporter.toLowerCase() ===
            messageOwner.toLowerCase()
        ) {

          socket.emit(
            "report_error",
            {
              message:
                "Aap apna message report nahi kar sakte."
            }
          );

          return;
        }

        const newReport = {

          messageId:
            String(messageId),

          reporter:
            reporter,

          username:
            reporter,

          reportedUsername:
            messageOwner,

          messageUsername:
            messageOwner,

          message:
            message,

          reason:
            reason,

          messageTime:
            report.messageTime ||
            report.time ||
            "",

          createdAt:
            new Date(),

          status:
            "pending"
        };

        if (!publicReportsCollection) {

          console.error(
            "REPORT ERROR: publicReportsCollection unavailable"
          );

          socket.emit(
            "report_error",
            {
              message:
                "Reports database available nahi hai."
            }
          );

          return;
        }

        const result =
          await publicReportsCollection.insertOne(
            newReport
          );

        newReport._id =
          result.insertedId;

        console.log(
          "PUBLIC MESSAGE REPORT SAVED"
        );

        console.log(
          "REPORT ID:",
          newReport._id.toString()
        );

        console.log(
          "REPORTER:",
          newReport.reporter
        );

        console.log(
          "REPORTED USER:",
          newReport.reportedUsername
        );

        console.log(
          "REASON:",
          newReport.reason
        );

        socket.emit(
          "report_submitted",
          {
            success: true,
            report: newReport
          }
        );

        io.emit(
          "new_public_report",
          newReport
        );

        await sendAdminReports();

      } catch (error) {

        console.error(
          "REPORT SAVE ERROR:",
          error
        );

        socket.emit(
          "report_error",
          {
            message:
              "Report save nahi ho saki."
          }
        );
      }
    }
  );

  // ========================================
  // ADMIN REPORTS
  // ========================================

  socket.on(
    "get_admin_reports",
    async () => {

      try {

        console.log(
          "ADMIN REQUESTING REPORTS..."
        );

        if (
          !publicReportsCollection
        ) {

          console.error(
            "ADMIN REPORT ERROR: collection unavailable"
          );

          socket.emit(
            "admin_reports_data",
            []
          );

          return;
        }

        const reports =
          await publicReportsCollection
            .find({})
            .sort({
              createdAt: -1
            })
            .toArray();

        console.log(
          "ADMIN REPORTS FOUND:",
          reports.length
        );

        socket.emit(
          "admin_reports_data",
          reports
        );

      } catch (error) {

        console.error(
          "Admin reports error:",
          error
        );

        socket.emit(
          "admin_reports_data",
          []
        );
      }
    }
  );

  // ========================================
  // DELETE REPORT
  // ========================================
  // IMPORTANT:
  // Admin.js sends "delete_admin_report"
  // We support BOTH event names.
  // ========================================

  const deleteAdminReport = async (data) => {

    try {

      console.log(
        "===================================="
      );

      console.log(
        "DELETE REPORT REQUEST RECEIVED:",
        data
      );

      console.log(
        "===================================="
      );

      if (
        !data ||
        !data.reportId
      ) {

        console.log(
          "DELETE REPORT ERROR: reportId missing"
        );

        return;
      }

      if (
        !publicReportsCollection
      ) {

        console.log(
          "DELETE REPORT ERROR: collection unavailable"
        );

        return;
      }

      const admin =
        normalizeUsername(
          data.admin ||
          socket.username ||
          ""
        );

      const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {

        console.log(
          "DELETE REPORT DENIED. ADMIN:",
          admin
        );

        socket.emit(
          "report_delete_error",
          {
            success: false,
            message:
              "Sirf Armani report delete kar sakta hai."
          }
        );

        return;
      }

      const reportId =
        String(
          data.reportId
        );

      let reportObjectId;

      try {

        reportObjectId =
          new ObjectId(
            reportId
          );

      } catch (idError) {

        console.error(
          "Invalid report ID:",
          reportId
        );

        socket.emit(
          "report_delete_error",
          {
            success: false,
            message:
              "Report ID invalid hai."
          }
        );

        return;
      }

      console.log(
        "DELETING REPORT ID:",
        reportId
      );

      const result =
        await publicReportsCollection.deleteOne({
          _id:
            reportObjectId
        });

      console.log(
        "REPORT DELETE RESULT:",
        result.deletedCount
      );

      if (
        result.deletedCount === 0
      ) {

        socket.emit(
          "report_delete_error",
          {
            success: false,
            message:
              "Report nahi mili ya pehle hi delete ho chuki hai."
          }
        );

        return;
      }

      console.log(
        "REPORT SUCCESSFULLY DELETED:",
        reportId
      );

      // Tell all admin panels
      io.emit(
        "report_deleted",
        {
          deletedId:
            reportId
        }
      );

      // Fresh report list
      await sendAdminReports();

      // Confirmation
      socket.emit(
        "report_delete_success",
        {
          success: true,
          deletedId:
            reportId
        }
      );

    } catch (error) {

      console.error(
        "Delete report error:",
        error
      );

      socket.emit(
        "report_delete_error",
        {
          success: false,
          message:
            "Report delete nahi ho saki."
        }
      );
    }
  };

  // NEW EVENT - Admin.js
  socket.on(
    "delete_admin_report",
    deleteAdminReport
  );

  // OLD EVENT - compatibility
  socket.on(
    "delete_report",
    deleteAdminReport
  );

  // ========================================
  // CREATE PROMOTION
  // ========================================

  socket.on(
    "create_promotion",
    async (promotionData) => {

      try {

        console.log(
          "CREATE PROMOTION EVENT RECEIVED:",
          promotionData
        );

        if (!promotionData) {
          return;
        }

        const username =
          normalizeUsername(
            promotionData.username
          );

        const title =
          String(
            promotionData.title ||
              ""
          ).trim();

        const description =
          String(
            promotionData.description ||
              ""
          ).trim();

        const link =
          String(
            promotionData.link ||
              ""
          ).trim();

        if (
          !username ||
          !title ||
          !description
        ) {

          socket.emit(
            "promotion_error",
            {
              message:
                "Promotion title aur description zaroori hain."
            }
          );

          return;
        }

        const promotion = {

          username,

          title,

          description,

          link,

          image:
            promotionData.image ||
            "",

          promotionTitle:
            promotionData.promotionTitle ||
            "??? Product Promotion",

          active:
            false,

          approved:
            false,

          status:
            "pending",

          createdAt:
            new Date(),

          updatedAt:
            new Date()
        };

        const result =
          await promotionsCollection.insertOne(
            promotion
          );

        promotion._id =
          result.insertedId;

        console.log(
          "PROMOTION SAVED:",
          promotion._id
        );

        socket.emit(
          "promotion_created",
          promotion
        );

        io.emit(
          "new_promotion_for_admin",
          promotion
        );

      } catch (error) {

        console.error(
          "Create promotion error:",
          error
        );

        socket.emit(
          "promotion_error",
          {
            message:
              "Promotion save nahi ho saki."
          }
        );
      }
    }
  );

  // ========================================
  // GET PENDING PROMOTIONS
  // ========================================

  socket.on(
    "get_pending_promotions",
    async () => {

      try {

        console.log(
          "REQUESTING PENDING PROMOTIONS..."
        );

        const pending =
          await getPendingPromotions();

        console.log(
          "PENDING PROMOTIONS:",
          pending.length
        );

        socket.emit(
          "pending_promotions_data",
          pending
        );

      } catch (error) {

        console.error(
          "Pending promotions error:",
          error
        );

        socket.emit(
          "pending_promotions_data",
          []
        );
      }
    }
  );

  // ========================================
  // GET ADMIN PROMOTIONS
  // ========================================

  socket.on(
    "get_admin_promotions",
    async () => {

      try {

        const promotions =
          await promotionsCollection
            .find({
              approved: true
            })
            .sort({
              createdAt: -1
            })
            .toArray();

        socket.emit(
          "admin_promotions_data",
          promotions
        );

      } catch (error) {

        console.error(
          "Admin promotions error:",
          error
        );

        socket.emit(
          "admin_promotions_data",
          []
        );
      }
    }
  );

  // ========================================
  // GET PUBLIC / FEATURED PROMOTIONS
  // ========================================

  socket.on(
    "get_promotions",
    async () => {

      try {

        const promotions =
          await getApprovedPromotions();

        socket.emit(
          "promotions_data",
          promotions
        );

      } catch (error) {

        console.error(
          "Promotions error:",
          error
        );

        socket.emit(
          "promotions_data",
          []
        );
      }
    }
  );

  // ========================================
  // APPROVE PROMOTION
  // ========================================

  socket.on(
    "approve_promotion",
    async (data) => {
      try {
        console.log("APPROVE PROMOTION REQUEST:", data);

        if (!data || !data.promotionId) {
          console.log("APPROVE PROMOTION ERROR: Promotion ID missing");
          return;
        }

        const suppliedAdmin = normalizeUsername(data.admin || "");
        const socketUsername = normalizeUsername(socket.username || "");
        const actorUsername = suppliedAdmin || socketUsername;

        if (
          socketUsername &&
          suppliedAdmin &&
          socketUsername.toLowerCase() !== suppliedAdmin.toLowerCase()
        ) {
          console.log(
            "PROMOTION ACTION DENIED: Username mismatch",
            socketUsername,
            suppliedAdmin
          );
          return;
        }

        const actor = await usersCollection.findOne({
          username: actorUsername
        });

        if (!actor) {
          console.log("APPROVE PROMOTION DENIED: Actor verification failed");
          return;
        }

        const actorRole = getUserRole(actor);

        console.log(
          "APPROVE PROMOTION ACTOR:",
          actor.username,
          "ROLE:",
          actorRole
        );

        if (
          actorRole !== "superadmin" &&
          actorRole !== "admin" &&
          actorRole !== "moderator"
        ) {
          console.log(
            "APPROVE PROMOTION DENIED:",
            actor.username,
            "ROLE:",
            actorRole
          );
          return;
        }

        let promotionId;

        try {
          promotionId = new ObjectId(String(data.promotionId));
        } catch (idError) {
          console.log("APPROVE PROMOTION ERROR: Invalid promotion ID");
          return;
        }

        const result = await promotionsCollection.findOneAndUpdate(
          { _id: promotionId },
          {
            $set: {
              approved: true,
              active: true,
              status: "approved",
              approvedBy: actor.username,
              approvedAt: new Date(),
              updatedAt: new Date()
            }
          },
          { returnDocument: "after" }
        );

        const updatedPromotion = result;

        if (!updatedPromotion) {
          console.log("APPROVE PROMOTION ERROR: Promotion not found");
          return;
        }

        console.log(
          "PROMOTION APPROVED:",
          updatedPromotion._id,
          "BY:",
          actor.username,
          "ROLE:",
          actorRole
        );

        io.emit("promotion_approved", updatedPromotion);
        io.emit("promotion_updated", updatedPromotion);

        const promotions = await getApprovedPromotions();
        io.emit("promotions_data", promotions);

        socket.emit("promotion_action_success", {
          success: true,
          action: "approve",
          promotion: updatedPromotion
        });

      } catch (error) {
        console.error("Approve promotion error:", error);
      }
    }
  );

  // ========================================
  // REJECT PROMOTION
  // ========================================

  socket.on(
    "reject_promotion",
    async (data) => {
      try {
        console.log("REJECT PROMOTION REQUEST:", data);

        if (!data || !data.promotionId) {
          console.log("REJECT PROMOTION ERROR: Promotion ID missing");
          return;
        }

        const suppliedAdmin = normalizeUsername(data.admin || "");
        const socketUsername = normalizeUsername(socket.username || "");
        const actorUsername = suppliedAdmin || socketUsername;

        if (
          socketUsername &&
          suppliedAdmin &&
          socketUsername.toLowerCase() !== suppliedAdmin.toLowerCase()
        ) {
          console.log(
            "PROMOTION ACTION DENIED: Username mismatch",
            socketUsername,
            suppliedAdmin
          );
          return;
        }

        const actor = await usersCollection.findOne({
          username: actorUsername
        });

        if (!actor) {
          console.log("REJECT PROMOTION DENIED: Actor verification failed");
          return;
        }

        const actorRole = getUserRole(actor);

        console.log(
          "REJECT PROMOTION ACTOR:",
          actor.username,
          "ROLE:",
          actorRole
        );

        if (
          actorRole !== "superadmin" &&
          actorRole !== "admin" &&
          actorRole !== "moderator"
        ) {
          console.log(
            "REJECT PROMOTION DENIED:",
            actor.username,
            "ROLE:",
            actorRole
          );
          return;
        }

        let promotionId;

        try {
          promotionId = new ObjectId(String(data.promotionId));
        } catch (idError) {
          console.log("REJECT PROMOTION ERROR: Invalid promotion ID");
          return;
        }

        const deleteResult = await promotionsCollection.deleteOne({
          _id: promotionId
        });

        if (deleteResult.deletedCount === 0) {
          console.log("REJECT PROMOTION ERROR: Promotion not found");
          return;
        }

        console.log(
          "PROMOTION REJECTED:",
          String(data.promotionId),
          "BY:",
          actor.username,
          "ROLE:",
          actorRole
        );

        io.emit("promotion_rejected", {
          deletedId: String(data.promotionId)
        });

        socket.emit("promotion_action_success", {
          success: true,
          action: "reject",
          deletedId: String(data.promotionId)
        });

      } catch (error) {
        console.error("Reject promotion error:", error);
      }
    }
  );
  // ========================================
  // UPDATE PROMOTION
  // ========================================

  socket.on(
    "update_promotion",
    async (data) => {

      try {

        if (
          !data ||
          !data.promotionId
        ) {
          return;
        }

        const admin =
          normalizeUsername(
            data.admin ||
            socket.username ||
            ""
          );

        const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
          return;
        }

        const promotionId =
          new ObjectId(
            data.promotionId
          );

        const update = {
          updatedAt:
            new Date()
        };

        if (
          typeof data.active ===
          "boolean"
        ) {
          update.active =
            data.active;
        }

        if (
          typeof data.approved ===
          "boolean"
        ) {
          update.approved =
            data.approved;
        }

        const result =
          await promotionsCollection.findOneAndUpdate(
            {
              _id:
                promotionId
            },
            {
              $set:
                update
            },
            {
              returnDocument:
                "after"
            }
          );

        if (!result) {
          return;
        }

        io.emit(
          "promotion_updated",
          result
        );

        const promotions =
          await getApprovedPromotions();

        io.emit(
          "promotions_data",
          promotions
        );

      } catch (error) {

        console.error(
          "Update promotion error:",
          error
        );
      }
    }
  );

  // ========================================
  // TOGGLE PROMOTION
  // ========================================

  socket.on(
    "toggle_promotion",
    async (data) => {

      try {

        if (
          !data ||
          !data.promotionId
        ) {
          return;
        }

        const admin =
          normalizeUsername(
            data.admin ||
            socket.username ||
            ""
          );

        const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
          return;
        }

        const promotionId =
          new ObjectId(
            data.promotionId
          );

        const promotion =
          await promotionsCollection.findOne({
            _id:
              promotionId
          });

        if (!promotion) {
          return;
        }

        const newActive =
          !promotion.active;

        const result =
          await promotionsCollection.findOneAndUpdate(
            {
              _id:
                promotionId
            },
            {
              $set: {

                active:
                  newActive,

                updatedAt:
                  new Date()
              }
            },
            {
              returnDocument:
                "after"
            }
          );

        if (!result) {
          return;
        }

        console.log(
          "PROMOTION UPDATED:",
          result
        );

        io.emit(
          "promotion_updated",
          result
        );

        const promotions =
          await getApprovedPromotions();

        io.emit(
          "promotions_data",
          promotions
        );

      } catch (error) {

        console.error(
          "Toggle promotion error:",
          error
        );
      }
    }
  );

  // ========================================
  // DELETE PROMOTION
  // ========================================

  socket.on(
    "delete_promotion",
    async (data) => {

      try {

        if (
          !data ||
          !data.promotionId
        ) {
          return;
        }

        const admin =
          normalizeUsername(
            data.admin ||
            socket.username ||
            ""
          );

        const actor = usersCollection ? await getUserByUsername(admin) : null

      if (!actor || (!isMainAdminUsername(admin) && normalizeRole(actor.role) !== "admin" && normalizeRole(actor.role) !== "moderator")) {
          return;
        }

        const promotionId =
          new ObjectId(
            data.promotionId
          );

        await promotionsCollection.deleteOne({
          _id:
            promotionId
        });

        console.log(
          "PROMOTION DELETED:",
          data.promotionId
        );

        io.emit(
          "promotion_deleted",
          {
            deletedId:
              String(
                data.promotionId
              )
          }
        );

        const promotions =
          await getApprovedPromotions();

        io.emit(
          "promotions_data",
          promotions
        );

      } catch (error) {

        console.error(
          "Delete promotion error:",
          error
        );
      }
    }
  );

  // ========================================
  // DISCONNECT
  // ========================================

  socket.on(
    "disconnect",
    () => {

      const username =
        socket.username;

      if (
        username &&
        onlineUsers[username] ===
          socket.id
      ) {

        delete onlineUsers[
          username
        ];
      }

      console.log(
        "User disconnected:",
        username ||
          socket.id
      );

      broadcastOnlineUsers();
    }
  );

  socket.on("request_password_reset", async ({ email }) => {
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();

      if (!normalizedEmail) {
        socket.emit("password_reset_result", {
          success: false,
          message: "Email address enter karein."
        });
        return;
      }

      const user = await usersCollection.findOne({
        email: normalizedEmail
      });

      // Security: registered/unregistered email ka difference reveal nahi karna
      if (!user) {
        socket.emit("password_reset_result", {
          success: true,
          message: "Agar ye email registered hai to OTP bhej diya gaya hai."
        });
        return;
      }

      const existingReset = await passwordResetsCollection.findOne({
        email: normalizedEmail
      });

      if (
        existingReset &&
        existingReset.lastSentAt &&
        Date.now() - new Date(existingReset.lastSentAt).getTime() < 60000
      ) {
        socket.emit("password_reset_result", {
          success: true,
          message: "Agar ye email registered hai to OTP bhej diya gaya hai."
        });
        return;
      }

      const otp = crypto.randomInt(100000, 1000000).toString();
      const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await passwordResetsCollection.deleteMany({
        email: normalizedEmail
      });

      await passwordResetsCollection.insertOne({
        email: normalizedEmail,
        otpHash,
        attempts: 0,
        verified: false,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        lastSentAt: new Date(),
        createdAt: new Date(),
        expiresAt
      });

      await mailTransporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: "Selling GupShup Password Reset OTP",
        text:
          "Aap ka Selling GupShup password reset OTP: " +
          otp +
          "\n\nYe OTP 10 minutes tak valid hai.\n\n" +
          "Agar aapne password reset request nahi ki to is email ko ignore karein.",
        html:
          "<div style=\"font-family:Arial,sans-serif;max-width:500px;margin:auto\">" +
          "<h2>Selling GupShup</h2>" +
          "<p>Aap ke password reset ke liye OTP hai:</p>" +
          "<div style=\"font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:15px\">" +
          otp +
          "</div>" +
          "<p>Ye OTP <b>10 minutes</b> tak valid hai.</p>" +
          "<p>Agar aapne password reset request nahi ki to is email ko ignore karein.</p>" +
          "</div>"
      });

      console.log("PASSWORD RESET OTP SENT:", normalizedEmail);

      socket.emit("password_reset_result", {
        success: true,
        message: "OTP aap ke Gmail par bhej diya gaya hai."
      });
    } catch (error) {
      console.error("PASSWORD RESET OTP ERROR:", error);

      socket.emit("password_reset_result", {
        success: false,
        message: "OTP send nahi ho saka. Thori dair baad dobara try karein."
      });
    }
  });

  socket.on("verify_password_reset", async ({ email, otp }) => {
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const enteredOtp = String(otp || "").trim();

      if (!normalizedEmail || !enteredOtp) {
        socket.emit("password_reset_verify_result", {
          success: false,
          message: "Email aur OTP enter karein."
        });
        return;
      }

      const reset = await passwordResetsCollection.findOne({
        email: normalizedEmail,
        expiresAt: { $gt: new Date() }
      });

      if (!reset) {
        socket.emit("password_reset_verify_result", {
          success: false,
          message: "OTP expire ho gaya hai. Naya OTP mangwayein."
        });
        return;
      }

      if ((reset.attempts || 0) >= 5) {
        await passwordResetsCollection.deleteOne({
          _id: reset._id
        });

        socket.emit("password_reset_verify_result", {
          success: false,
          message: "OTP attempts khatam ho gaye. Naya OTP mangwayein."
        });
        return;
      }

      const enteredOtpHash = crypto
        .createHash("sha256")
        .update(enteredOtp)
        .digest("hex");

      if (enteredOtpHash !== reset.otpHash) {
        await passwordResetsCollection.updateOne(
          { _id: reset._id },
          { $inc: { attempts: 1 } }
        );

        socket.emit("password_reset_verify_result", {
          success: false,
          message: "OTP ghalat hai."
        });
        return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      await passwordResetsCollection.updateOne(
        { _id: reset._id },
        {
          $set: {
            verified: true,
            otpHash: null,
            resetTokenHash,
            resetTokenExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
          }
        }
      );

      socket.emit("password_reset_verify_result", {
        success: true,
        message: "OTP verify ho gaya. Ab naya password set karein.",
        resetToken
      });
    } catch (error) {
      console.error("PASSWORD RESET VERIFY ERROR:", error);

      socket.emit("password_reset_verify_result", {
        success: false,
        message: "OTP verify nahi ho saka."
      });
    }
  });

  socket.on("reset_password", async ({ email, resetToken, newPassword }) => {
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const password = String(newPassword || "");
      const token = String(resetToken || "");

      if (!normalizedEmail || !token || !password) {
        socket.emit("password_reset_final_result", {
          success: false,
          message: "Sab fields complete karein."
        });
        return;
      }

      if (password.length < 6) {
        socket.emit("password_reset_final_result", {
          success: false,
          message: "Password kam az kam 6 characters ka hona chahiye."
        });
        return;
      }

      const resetTokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      const reset = await passwordResetsCollection.findOne({
        email: normalizedEmail,
        verified: true,
        resetTokenHash,
        resetTokenExpiresAt: { $gt: new Date() }
      });

      if (!reset) {
        socket.emit("password_reset_final_result", {
          success: false,
          message: "Password reset session expire ho gaya. Dobara OTP request karein."
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const updateResult = await usersCollection.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            password: passwordHash
          }
        }
      );

      if (updateResult.matchedCount !== 1) {
        socket.emit("password_reset_final_result", {
          success: false,
          message: "Account nahi mila."
        });
        return;
      }

      await passwordResetsCollection.deleteOne({
        _id: reset._id
      });

      console.log("PASSWORD RESET SUCCESS:", normalizedEmail);

      socket.emit("password_reset_final_result", {
        success: true,
        message: "Password successfully change ho gaya. Ab login karein."
      });
    } catch (error) {
      console.error("PASSWORD RESET FINAL ERROR:", error);

      socket.emit("password_reset_final_result", {
        success: false,
        message: "Password reset nahi ho saka."
      });
    }
  });

});

// ==========================================
// SERVE REACT BUILD IN PRODUCTION
// ==========================================

const buildDir = path.join(__dirname, "build");

if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));

  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

// ==========================================
// START SERVER
// ==========================================

async function startServer() {

  await connectMongoDB();

  httpServer.listen(process.env.PORT || 5000, () => { console.log(`Selling GupShup Server running on port ${process.env.PORT || 5000}`); });
}

startServer();






















































