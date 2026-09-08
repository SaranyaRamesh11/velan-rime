const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;

const RIME_ENDPOINT =
    process.env.RIME_ENDPOINT || "https://users.rime.ai/v1/rime-tts";

const RIME_API_KEY = process.env.RIME_API_KEY;
const RIME_MODEL_ID = process.env.RIME_MODEL_ID || "coda";
const RIME_SPEAKER = process.env.RIME_SPEAKER || "astra";
const RIME_LANGUAGE = process.env.RIME_LANGUAGE || "en";

if (!RIME_API_KEY) {
    console.error("ERROR: RIME_API_KEY is missing in backend/.env");
    process.exit(1);
}

app.use(cors());
app.use(express.json());


// Serve frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));


// ------------------------------------
// HEALTH CHECK
// ------------------------------------

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "VELAN backend"
    });
});


// ------------------------------------
// RIME TTS
// ------------------------------------

app.post("/api/tts", async (req, res) => {

    const { text } = req.body;

    if (!text || typeof text !== "string") {
        return res.status(400).json({
            error: "Text is required."
        });
    }

    const cleanedText = text.trim();

    if (!cleanedText) {
        return res.status(400).json({
            error: "Text cannot be empty."
        });
    }


    console.log("Sending text to Rime:");
    console.log(cleanedText);


    // We use this controller later for true interruption/cancellation.
    const controller = new AbortController();


    try {

        const rimeResponse = await fetch(RIME_ENDPOINT, {
            method: "POST",

            headers: {
                "Authorization": `Bearer ${RIME_API_KEY}`,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg"
            },

            body: JSON.stringify({
                speaker: RIME_SPEAKER,
                text: cleanedText,
                modelId: RIME_MODEL_ID,
                lang: RIME_LANGUAGE
            }),

            signal: controller.signal
        });


        console.log("Rime response status:", rimeResponse.status);


        if (!rimeResponse.ok) {

            const errorText = await rimeResponse.text();

            console.error("Rime API error:", errorText);

            return res.status(rimeResponse.status).json({
                error: "Rime TTS request failed.",
                details: errorText
            });
        }


        if (!rimeResponse.body) {

            return res.status(500).json({
                error: "Rime returned no audio body."
            });
        }


        // Current Rime HTTP example returns MP3.
        res.setHeader(
            "Content-Type",
            rimeResponse.headers.get("content-type") || "audio/mpeg"
        );

        res.setHeader(
            "Cache-Control",
            "no-store"
        );


        for await (const chunk of rimeResponse.body) {

            if (res.destroyed) {
                break;
            }

            res.write(Buffer.from(chunk));
        }


        if (!res.destroyed) {
            res.end();
        }

    }

    catch (error) {

        console.error("TTS server error:", error);

        if (!res.headersSent) {

            return res.status(500).json({
                error: "Internal server error.",
                details: error.message
            });
        }

        if (!res.destroyed) {
            res.end();
        }
    }

});


// ------------------------------------
// START SERVER
// ------------------------------------

app.listen(PORT, () => {

    console.log("");
    console.log("=======================================");
    console.log("        VELAN BACKEND RUNNING");
    console.log("=======================================");
    console.log(`Local URL: http://localhost:${PORT}`);
    console.log(`Rime endpoint: ${RIME_ENDPOINT}`);
    console.log(`Model: ${RIME_MODEL_ID}`);
    console.log(`Speaker: ${RIME_SPEAKER}`);
    console.log(`Language: ${RIME_LANGUAGE}`);
    console.log("=======================================");
    console.log("");
});