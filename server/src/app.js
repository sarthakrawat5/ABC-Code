import cors from "cors";
import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, ApiError } from "./errors.js";
import eventsRouter from "./routes/events.js";
import clubsRouter from "./routes/clubs.js";
import bookmarksRouter from "./routes/bookmarks.js";
import registrationsRouter from "./routes/registrations.js";
import usersRouter from "./routes/users.js";
import ticketsRouter from "./routes/tickets.js";

const app = express();
const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      connectSrc: ["'self'", "https://*.supabase.co", "https://*.supabase.in"],
      formAction: ["'self'", "https://*.supabase.co"]
    }
  }
}));
app.use(cors({ origin: config.appOrigin, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "32kb" }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false }));
app.use("/api", attachUser);

app.get("/api/config", (_request, response) => {
  response.json({ supabaseUrl: config.supabaseUrl, supabaseAnonKey: config.supabaseAnonKey });
});
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));

app.use("/api/events", eventsRouter);
app.use("/api/events", bookmarksRouter);
app.use("/api/events", registrationsRouter);
app.use("/api/clubs", clubsRouter);
app.use("/api/users", usersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api", (_request, _response, next) => next(new ApiError(404, "API endpoint not found.", "NOT_FOUND")));

app.get("/events/:slug", (_request, response) => response.sendFile(path.join(projectRoot, "index.html")));
app.get("/client.js", (_request, response) => response.sendFile(path.join(projectRoot, "client.js")));
app.get("/", (_request, response) => response.sendFile(path.join(projectRoot, "index.html")));
app.use((_request, _response, next) => next(new ApiError(404, "Page not found.", "NOT_FOUND")));
app.use(errorHandler);

export default app;
