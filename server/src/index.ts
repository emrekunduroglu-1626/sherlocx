import "dotenv/config";
import express from "express";
import cors from "cors";
import gameRouter from "./routes/game";
import { isMockMode } from "./lib/llm";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, mode: isMockMode() ? "mock" : "live" }));
app.use("/api", gameRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`SherlocX server :${port} — mod: ${isMockMode() ? "MOCK (anahtar yok, maliyet sıfır)" : "LIVE"}`);
});
