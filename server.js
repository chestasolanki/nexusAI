import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { run_researchPipeline } from "./pipeline.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, "public")));

// Server-Sent Events: the UI opens /api/research?topic=... and gets live step updates
app.get("/api/research", async (req, res) => {
    const topic = String(req.query.topic ?? "").trim();
    if (!topic) return res.status(400).json({ error: "Missing topic" });

    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
    });
    res.flushHeaders();

    const send = (event, data) =>
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    try {
        await run_researchPipeline(topic, (step, status, payload) =>
            send("progress", { step, status, payload })
        );
        send("complete", {});
    } catch (err) {
        console.error("Pipeline failed:", err);
        send("pipeline_error", { message: err.message });
    }
    res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NexusAI running at http://localhost:${PORT}`));