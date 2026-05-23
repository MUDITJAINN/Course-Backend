import express from 'express';
import mongoose from 'mongoose';
import config from './config.js';
import { v2 as cloudinary } from 'cloudinary';
import courseRoutes from './routes/course.routes.js';
import userRoutes from "./routes/user.routes.js";
import adminRoute from "./routes/admin.route.js";
import noteRoutes from "./routes/note.routes.js";
import { mountChatbot } from "./ai-chatbot/index.js";
import { mountAiTutor } from "./ai-tutor/index.js";
import { Course } from "./models/course.model.js";
import { Note } from "./models/note.model.js";
import fileUpload from 'express-fileupload';
import cookieParser from 'cookie-parser';
import cors from "cors";
import compression from "compression";
import helmet from "helmet";

const app = express();
//middleware
app.disable("x-powered-by");

const frameAncestorOrigins = config.frameAncestorOrigins;

const cspDefaults = helmet.contentSecurityPolicy.getDefaultDirectives();
// Avoid duplicate frame-ancestors directives (some environments/frameworks may inject one)
delete cspDefaults.frameAncestors;
delete cspDefaults["frame-ancestors"];

app.use(
  helmet({
    // Helmet otherwise sets X-Frame-Options=SAMEORIGIN which will block cross-site iframes.
    // We rely on CSP frame-ancestors instead.
    frameguard: false,
    // Allow frontend to embed preview PDFs/images in iframes when needed
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        ...cspDefaults,
        frameAncestors: ["'self'", ...frameAncestorOrigins],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(fileUpload({
  useTempFiles : true,
  tempFileDir : '/tmp/',
}));
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const port = config.port;
const DB_URI = config.mongoUri;

if (!DB_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

try {
  await mongoose.connect(DB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log("Connected to the database");
} catch (error) {
  console.error("\nMongoDB connection failed:", error.message);
  console.error(
    "Fix checklist:\n" +
      "  1. Internet / DNS working (ENOTFOUND = cannot resolve Atlas host)\n" +
      "  2. MongoDB Atlas → Network Access → allow your IP (or 0.0.0.0/0 for dev)\n" +
      "  3. Cluster not paused; MONGO_URI correct in backend/.env\n" +
      "  4. Remove extra quotes around MONGO_URI value\n"
  );
  process.exit(1);
}

// defining routes
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/notes", noteRoutes);

// AI chatbot — copy the `ai-chatbot` folder to reuse in other Express apps
mountChatbot(app, {
  siteName: config.siteName,
  fetchCourses: async () =>
    Course.find({})
      .select("title description price")
      .sort({ _id: -1 })
      .limit(40)
      .lean(),
  fetchNotes: async () =>
    Note.find({ isPublished: true })
      .select("title description price pages")
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
});

// AI course tutor — Ollama + RAG over lecture transcripts (purchase-gated)
mountAiTutor(app);

cloudinary.config(config.cloudinary);

const server = app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${port} is already in use. Stop the other backend process:\n` +
        `  PowerShell: Get-NetTCPConnection -LocalPort ${port} | Select OwningProcess\n` +
        `  Then: Stop-Process -Id <PID> -Force\n` +
        `Or change PORT in backend/.env\n`
    );
    process.exit(1);
  }
  throw err;
});