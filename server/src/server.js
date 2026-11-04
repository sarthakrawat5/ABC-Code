import app from "./app.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`Nexus Club listening on http://localhost:${config.port}`);
});

function close(signal) {
  console.log(`${signal} received; closing server.`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => close("SIGINT"));
process.on("SIGTERM", () => close("SIGTERM"));
