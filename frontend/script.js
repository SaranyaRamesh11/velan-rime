// ============================================================
// VELAN - Voice-First Farming Companion
// Complete Frontend
// Speech Recognition + Farm Decision Logic + Rime TTS
// Interruption + Recovery
// ============================================================

let farmData = null;
let recognition = null;

let isListening = false;
let currentAudio = null;

// Every request gets a unique version.
// If a newer request starts, an older response becomes invalid.
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

        // Default display
        updateFarmDisplay(farmData.scenarios.irrigation);

        updateVelanStatus("Ready");

    } catch (error) {
        console.error("Farm data loading error:", error);

        updateVelanStatus("Error");

        const message = document.getElementById("statusMessage");

        if (message) {
            message.textContent =
                "Unable to load farm data.";
        }
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
// SPEECH RECOGNITION
// ============================================================

function setupSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        console.error(
            "Speech recognition is not supported."
        );

        updateVelanStatus("Error");

        document.getElementById("statusMessage").textContent =
            "Speech recognition is not supported in this browser.";

        return;
    }


    recognition = new SpeechRecognition();

    // Tamil speech recognition
    recognition.lang = "ta-IN";

    // Listen for one user turn at a time
    recognition.continuous = false;

    // Final result only
    recognition.interimResults = false;


    // --------------------------------------------------------
    // START
    // --------------------------------------------------------

    recognition.onstart = () => {

        isListening = true;

        updateVelanStatus("Listening");

        const micButton =
            document.getElementById("micButton");

        if (micButton) {
            micButton.classList.add("active");
        }
    };


    // --------------------------------------------------------
    // RESULT
    // --------------------------------------------------------

    recognition.onresult = async (event) => {

        const transcript =
            event.results[0][0].transcript.trim();

        console.log("Farmer said:", transcript);


        if (!transcript) {

            updateVelanStatus("Ready");

            return;
        }


        updateFarmerQuestion(transcript);

        isListening = false;


        const micButton =
            document.getElementById("micButton");

        if (micButton) {
            micButton.classList.remove("active");
        }


        await processFarmerRequest(transcript);
    };


    // --------------------------------------------------------
    // ERROR
    // --------------------------------------------------------

    recognition.onerror = (event) => {

        console.error(
            "Speech recognition error:",
            event.error
        );

        isListening = false;

        const micButton =
            document.getElementById("micButton");

        if (micButton) {
            micButton.classList.remove("active");
        }


        // User simply didn't speak
        if (event.error === "no-speech") {

            updateVelanStatus("Ready");

            return;
        }


        updateVelanStatus("Error");
    };


    // --------------------------------------------------------
    // END
    // --------------------------------------------------------

    recognition.onend = () => {

        isListening = false;

        const micButton =
            document.getElementById("micButton");

        if (micButton) {
            micButton.classList.remove("active");
        }
    };
}


// ============================================================
// MICROPHONE BUTTON
// ============================================================

function setupMicButton() {

    const micButton =
        document.getElementById("micButton");


    if (!micButton) {

        console.error(
            "Microphone button not found."
        );

        return;
    }


    micButton.addEventListener("click", () => {

        // ----------------------------------------------------
        // If VELAN is speaking, clicking the mic acts as
        // an interruption.
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
                "Could not start recognition:",
                error.message
            );
        }
    });
}


// ============================================================
// PROCESS FARMER QUESTION
// ============================================================

async function processFarmerRequest(question) {

    updateVelanStatus("Processing");


    // Create new request version
    requestVersion++;

    const myRequestVersion =
        requestVersion;


    // Generate context-aware answer
    const responseText =
        generateVelanResponse(question);


    // Show answer in UI
    updateVelanResponse(responseText);


    // Send to Rime
    await speakWithRime(
        responseText,
        myRequestVersion
    );
}


// ============================================================
// NORMALIZE USER INPUT
// ============================================================

function normalizeQuestion(question) {

    return question
        .toLowerCase()
        .trim()
        .replace(/[!?.,]/g, "");
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
        normalizeQuestion(question);


    // ========================================================
    // 1. SOIL MOISTURE
    // ========================================================

    if (
        text.includes("soil moisture") ||
        text.includes("soil") ||
        text.includes("mannu eeram") ||
        text.includes("mannu eera") ||
        text.includes("eeram") ||
        text.includes("மண்") ||
        text.includes("ஈரம்")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return (
            "The soil moisture is currently low. " +
            "The field needs water, so irrigation is recommended."
        );
    }


    // ========================================================
    // 2. IRRIGATION / WATER
    // ========================================================

    if (
        text.includes("thanni") ||
        text.includes("தண்ணி") ||
        text.includes("தண்ணீர்") ||
        text.includes("water") ||
        text.includes("irrigation") ||
        text.includes("irigate") ||
        text.includes("paachanuma") ||
        text.includes("paachan") ||
        text.includes("thanni vidalama")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return (
            "The temperature is 38 degrees and the soil moisture " +
            "is low. Based on the current farm conditions, " +
            "irrigation is recommended today."
        );
    }


    // ========================================================
    // 3. MOTOR
    // ========================================================

    if (
        text.includes("motor") ||
        text.includes("pump") ||
        text.includes("motor on") ||
        text.includes("pump on")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return (
            "The soil moisture is low and the motor is currently off. " +
            "You can turn on the irrigation motor."
        );
    }


    // ========================================================
    // 4. RAIN
    // ========================================================

    if (
        text.includes("mazhai") ||
        text.includes("மழை") ||
        text.includes("rain") ||
        text.includes("rain varuma") ||
        text.includes("mazhai varuma")
    ) {

        const data =
            farmData.scenarios.rain;

        updateFarmDisplay(data);

        return (
            "Rain is expected today. " +
            "Avoid unnecessary irrigation and check the field again later."
        );
    }


    // ========================================================
    // 5. RAIN + WATER DECISION
    // ========================================================

    if (
        (
            text.includes("mazhai") ||
            text.includes("rain")
        ) &&
        (
            text.includes("thanni") ||
            text.includes("water") ||
            text.includes("irrigation")
        )
    ) {

        const data =
            farmData.scenarios.rain;

        updateFarmDisplay(data);

        return (
            "Rain is expected, so avoid giving unnecessary water " +
            "to the field today."
        );
    }


    // ========================================================
    // 6. FERTILIZER
    // ========================================================

    if (
        text.includes("fertilizer") ||
        text.includes("fertiliser") ||
        text.includes("uram") ||
        text.includes("உரம்") ||
        text.includes("fertilizer podalama") ||
        text.includes("uram podalama")
    ) {

        const data =
            farmData.scenarios.fertilizer;

        updateFarmDisplay(data);

        return (
            "The soil moisture is currently sufficient. " +
            "Avoid applying fertilizer immediately and check the field condition again."
        );
    }


    // ========================================================
    // 7. FARM STATUS
    // ========================================================

    if (
        text.includes("farm status") ||
        text.includes("field status") ||
        text.includes("nilam epdi") ||
        text.includes("vayal epdi") ||
        text.includes("field epdi")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return (
            "Your field temperature is 38 degrees. " +
            "Soil moisture is low, the motor is off, and the weather is sunny. " +
            "Irrigation is recommended."
        );
    }


    // ========================================================
    // 8. WHAT SHOULD I DO TODAY?
    // ========================================================

    if (
        text.includes("innaikku enna") ||
        text.includes("enna pannanum") ||
        text.includes("what should i do") ||
        text.includes("today") ||
        text.includes("inniku")
    ) {

        const data =
            farmData.scenarios.irrigation;

        updateFarmDisplay(data);

        return (
            "Today, check the soil moisture first. " +
            "It is currently low, so irrigation is recommended. " +
            "Also monitor the weather before watering."
        );
    }


    // ========================================================
    // 9. HELP
    // ========================================================

    if (
        text.includes("help") ||
        text.includes("enna kekalam") ||
        text.includes("what can you do")
    ) {

        return (
            "I can help you with irrigation, rain, soil moisture, " +
            "motor status, fertilizer, and daily farm decisions."
        );
    }


    // ========================================================
    // DEFAULT
    // ========================================================

    return (
        "I can help with irrigation, rain, soil moisture, " +
        "motor status, fertilizer, and farm decisions. " +
        "Please ask a farming-related question."
    );
}


// ============================================================
// RIME TEXT-TO-SPEECH
// ============================================================

async function speakWithRime(
    text,
    myRequestVersion
) {

    try {

        updateVelanStatus("Speaking");


        // ----------------------------------------------------
        // Ask backend for Rime audio
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
        // A newer request already exists
        // ----------------------------------------------------

        if (
            myRequestVersion !== requestVersion
        ) {

            return;
        }


        // ----------------------------------------------------
        // Rime returned an error
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
        // Convert Rime response into audio
        // ----------------------------------------------------

        const audioBlob =
            await response.blob();


        // ----------------------------------------------------
        // Check one more time before playback
        // ----------------------------------------------------

        if (
            myRequestVersion !== requestVersion
        ) {

            return;
        }


        const audioUrl =
            URL.createObjectURL(audioBlob);


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


        currentAudio = null;

        updateVelanStatus("Error");
    }
}


// ============================================================
// INTERRUPTION
// ============================================================

function interruptCurrentResponse() {

    console.log(
        "VELAN response interrupted."
    );


    // Invalidate current request
    requestVersion++;


    // Stop currently playing audio
    if (currentAudio) {

        try {

            currentAudio.pause();

            currentAudio.currentTime = 0;

        } catch (error) {

            console.error(
                "Error stopping audio:",
                error
            );
        }


        currentAudio = null;
    }


    updateVelanStatus("Interrupted");
}


// ============================================================
// STATUS UPDATE
// ============================================================

function updateVelanStatus(status) {

    const statusText =
        document.getElementById("statusText");

    const statusMessage =
        document.getElementById("statusMessage");

    const statusDot =
        document.querySelector(".status-dot");


    if (
        !statusText ||
        !statusMessage ||
        !statusDot
    ) {
        return;
    }


    statusText.textContent =
        status;


    // Clear old status classes
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