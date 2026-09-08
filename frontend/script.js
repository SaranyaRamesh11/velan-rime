// ============================================================
// VELAN - Voice-First Farming Companion
// Frontend Voice + Farm Data + Rime TTS Integration
// ============================================================

let farmData = null;
let recognition = null;

let isListening = false;
let currentAudio = null;

// Every new request gets a new version number.
// This prevents old responses from being played after interruption.
let requestVersion = 0;


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    loadFarmData();
    setupSpeechRecognition();
    setupMicButton();
});


// ============================================================
// LOAD FARM DATA
// ============================================================

async function loadFarmData() {

    try {

        const response = await fetch("farmData.json");

        if (!response.ok) {
            throw new Error("Could not load farmData.json");
        }

        farmData = await response.json();

        // Default state when application starts.
        const defaultScenario =
            farmData.scenarios.irrigation;

        updateFarmDisplay(defaultScenario);

        updateVelanStatus("Ready");

    } catch (error) {

        console.error("Farm data loading error:", error);

        updateVelanStatus("Error");

        document.getElementById("statusMessage").textContent =
            "Unable to load farm data.";
    }
}


// ============================================================
// UPDATE FARM CARDS
// ============================================================

function updateFarmDisplay(data) {

    if (!data) {
        return;
    }

    document.getElementById("temperature").textContent =
        data.temperature;

    document.getElementById("soilMoisture").textContent =
        data.soilMoisture;

    document.getElementById("motorStatus").textContent =
        data.motorStatus;

    document.getElementById("weather").textContent =
        data.weather;
}


// ============================================================
// SPEECH RECOGNITION SETUP
// ============================================================

function setupSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.error(
            "Speech Recognition is not supported by this browser."
        );

        updateVelanStatus("Error");

        document.getElementById("statusMessage").textContent =
            "Speech recognition is not supported in this browser.";

        return;
    }


    recognition = new SpeechRecognition();

    // Tamil speech recognition.
    recognition.lang = "ta-IN";

    recognition.continuous = false;
    recognition.interimResults = false;


    // ----------------------------------------
    // START LISTENING
    // ----------------------------------------

    recognition.onstart = () => {

        isListening = true;

        updateVelanStatus("Listening");

        document.getElementById("micButton")
            .classList.add("active");
    };


    // ----------------------------------------
    // SPEECH RESULT
    // ----------------------------------------

    recognition.onresult = async (event) => {

        const transcript =
            event.results[0][0].transcript.trim();

        console.log("Farmer:", transcript);


        if (!transcript) {

            updateVelanStatus("Ready");

            return;
        }


        // Show farmer's spoken question.
        updateFarmerQuestion(transcript);


        isListening = false;

        document.getElementById("micButton")
            .classList.remove("active");


        // Process the question.
        await processFarmerRequest(transcript);
    };


    // ----------------------------------------
    // SPEECH ERROR
    // ----------------------------------------

    recognition.onerror = (event) => {

        console.error(
            "Speech recognition error:",
            event.error
        );

        isListening = false;

        document.getElementById("micButton")
            .classList.remove("active");


        if (event.error === "no-speech") {

            updateVelanStatus("Ready");

        } else {

            updateVelanStatus("Error");
        }
    };


    // ----------------------------------------
    // SPEECH END
    // ----------------------------------------

    recognition.onend = () => {

        isListening = false;

        document.getElementById("micButton")
            .classList.remove("active");
    };
}


// ============================================================
// MICROPHONE BUTTON
// ============================================================

function setupMicButton() {

    const micButton =
        document.getElementById("micButton");


    if (!micButton) {
        console.error("Microphone button not found.");
        return;
    }


    micButton.addEventListener("click", () => {

        // ----------------------------------------------------
        // If VELAN is currently speaking,
        // the new click represents an interruption.
        // ----------------------------------------------------

        if (currentAudio) {

            interruptCurrentResponse();
        }


        if (!recognition) {

            updateVelanStatus("Error");

            return;
        }


        if (isListening) {
            return;
        }


        try {

            recognition.start();

        } catch (error) {

            console.log(
                "Recognition could not start:",
                error.message
            );
        }
    });
}


// ============================================================
// PROCESS FARMER REQUEST
// ============================================================

async function processFarmerRequest(question) {

    updateVelanStatus("Processing");


    // Create a new request version.
    requestVersion++;

    const myRequestVersion =
        requestVersion;


    // Generate VELAN's answer.
    const responseText =
        generateVelanResponse(question);


    // Show response immediately in UI.
    updateVelanResponse(responseText);


    // Speak using Rime.
    await speakWithRime(
        responseText,
        myRequestVersion
    );
}


// ============================================================
// FARMING DECISION LOGIC
// ============================================================

function generateVelanResponse(question) {

    if (!farmData) {

        return (
            "Farm data is not available right now. " +
            "Please try again."
        );
    }


    const text =
        question.toLowerCase();


    // --------------------------------------------------------
    // IRRIGATION
    // --------------------------------------------------------

    if (
        text.includes("thanni") ||
        text.includes("தண்ணி") ||
        text.includes("water") ||
        text.includes("irrigation") ||
        text.includes("irigate") ||
        text.includes("paachan") ||
        text.includes("paachanuma")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return "The temperature is 38 degrees and the soil moisture is low. Based on the current farm conditions, irrigation is recommended for your field today.";
    }


    // --------------------------------------------------------
    // RAIN
    // --------------------------------------------------------

    if (
        text.includes("mazhai") ||
        text.includes("மழை") ||
        text.includes("rain")
    ) {

        const data =
            farmData.scenarios.rain;

        updateFarmDisplay(data);

        return data.recommendation;
    }


    // --------------------------------------------------------
    // FERTILIZER
    // --------------------------------------------------------

    if (
        text.includes("fertilizer") ||
        text.includes("uram") ||
        text.includes("உரம்") ||
        text.includes("fertiliser")
    ) {

        const data =
            farmData.scenarios.fertilizer;

        updateFarmDisplay(data);

        return data.recommendation;
    }


    // --------------------------------------------------------
    // DEFAULT RESPONSE
    // --------------------------------------------------------

    return (
        "I can help you with irrigation, rain, " +
        "soil moisture, and fertilizer decisions."
    );
}


// ============================================================
// RIME TTS
// ============================================================

async function speakWithRime(
    text,
    myRequestVersion
) {

    try {

        updateVelanStatus("Speaking");


        // ----------------------------------------------------
        // Request audio from backend.
        // API key stays on the backend.
        // ----------------------------------------------------

        const response =
            await fetch("/api/tts", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text: text
                })
            });


        // ----------------------------------------------------
        // Ignore if another request became newer.
        // ----------------------------------------------------

        if (
            myRequestVersion !== requestVersion
        ) {

            return;
        }


        // ----------------------------------------------------
        // Rime error
        // ----------------------------------------------------

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Rime TTS error:",
                errorText
            );

            updateVelanStatus("Error");

            return;
        }


        // ----------------------------------------------------
        // Convert response to audio blob.
        // ----------------------------------------------------

        const audioBlob =
            await response.blob();


        // Check again before playing.
        if (
            myRequestVersion !== requestVersion
        ) {

            return;
        }


        const audioUrl =
            URL.createObjectURL(audioBlob);


        // ----------------------------------------------------
        // Create audio player.
        // ----------------------------------------------------

        const audio =
            new Audio(audioUrl);


        currentAudio =
            audio;


        // ----------------------------------------------------
        // AUDIO FINISHED
        // ----------------------------------------------------

        audio.onended = () => {

            URL.revokeObjectURL(audioUrl);

            if (
                currentAudio === audio
            ) {

                currentAudio = null;

                updateVelanStatus("Ready");
            }
        };


        // ----------------------------------------------------
        // AUDIO ERROR
        // ----------------------------------------------------

        audio.onerror = () => {

            URL.revokeObjectURL(audioUrl);

            if (
                currentAudio === audio
            ) {

                currentAudio = null;

                updateVelanStatus("Error");
            }
        };


        // ----------------------------------------------------
        // PLAY
        // ----------------------------------------------------

        await audio.play();

    } catch (error) {

        console.error(
            "Rime playback error:",
            error
        );


        // Ignore interruption-related cleanup errors.
        currentAudio = null;

        updateVelanStatus("Error");
    }
}


// ============================================================
// INTERRUPTION / RECOVERY
// ============================================================

function interruptCurrentResponse() {

    console.log(
        "VELAN response interrupted."
    );


    // --------------------------------------------------------
    // IMPORTANT:
    // Incrementing the request version makes the old request
    // obsolete. Even if its response arrives later, it will
    // not be played.
    // --------------------------------------------------------

    requestVersion++;


    // --------------------------------------------------------
    // Stop active Rime audio immediately.
    // --------------------------------------------------------

    if (currentAudio) {

        try {

            currentAudio.pause();

            currentAudio.currentTime = 0;

        } catch (error) {

            console.error(
                "Audio stop error:",
                error
            );
        }


        currentAudio = null;
    }


    // --------------------------------------------------------
    // Tell the UI that an interruption occurred.
    // --------------------------------------------------------

    updateVelanStatus("Interrupted");
}


// ============================================================
// UI STATUS
// ============================================================

function updateVelanStatus(status) {

    const statusText =
        document.getElementById("statusText");

    const statusMessage =
        document.getElementById("statusMessage");

    const statusDot =
        document.querySelector(".status-dot");


    if (!statusText ||
        !statusMessage ||
        !statusDot) {

        return;
    }


    statusText.textContent =
        status;


    // Reset classes.
    statusDot.className =
        "status-dot";


    // --------------------------------------------------------
    // READY
    // --------------------------------------------------------

    if (status === "Ready") {

        statusMessage.textContent =
            "Tap the microphone and ask VELAN about your farm.";

        statusDot.classList.add("ready");
    }


    // --------------------------------------------------------
    // LISTENING
    // --------------------------------------------------------

    else if (status === "Listening") {

        statusMessage.textContent =
            "VELAN is listening to the farmer...";

        statusDot.classList.add("listening");
    }


    // --------------------------------------------------------
    // PROCESSING
    // --------------------------------------------------------

    else if (status === "Processing") {

        statusMessage.textContent =
            "VELAN is analysing your farm conditions...";

        statusDot.classList.add("processing");
    }


    // --------------------------------------------------------
    // SPEAKING
    // --------------------------------------------------------

    else if (status === "Speaking") {

        statusMessage.textContent =
            "VELAN is speaking...";

        statusDot.classList.add("speaking");
    }


    // --------------------------------------------------------
    // INTERRUPTED
    // --------------------------------------------------------

    else if (status === "Interrupted") {

        statusMessage.textContent =
            "Previous response cancelled. Listening for your new request...";

        statusDot.classList.add("interrupted");
    }


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    else if (status === "Error") {

        statusMessage.textContent =
            "Something went wrong. Please try again.";

        statusDot.classList.add("error");
    }
}


// ============================================================
// UPDATE FARMER QUESTION
// ============================================================

function updateFarmerQuestion(question) {

    const element =
        document.getElementById(
            "farmerQuestion"
        );

    if (element) {

        element.textContent =
            question;
    }
}


// ============================================================
// UPDATE VELAN RESPONSE
// ============================================================

function updateVelanResponse(response) {

    const element =
        document.getElementById(
            "velanResponse"
        );

    if (element) {

        element.textContent =
            response;
    }
}