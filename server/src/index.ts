import "dotenv/config";
import express from "express";
import cors from "cors";
import gameRouter from "./routes/game";
import { isMockMode } from "./lib/llm";
import { storeMode } from "./lib/store";

const app = express();
app.use(cors({ origin: true, allowedHeaders: ["content-type", "x-device-id"] }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, llm: isMockMode() ? "mock" : "live", store: storeMode() }));
app.use("/api", gameRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`SherlocX :${port} | llm=${isMockMode() ? "mock" : "live"} | store=${storeMode()}`);
});
