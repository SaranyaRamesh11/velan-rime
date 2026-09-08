// ============================================================
// VELAN
// Voice-First Farming Companion
// ============================================================

let farmData = null;
let recognition = null;

let isListening = false;
let currentAudio = null;

let requestVersion = 0;
let selectedScenario = "dry";


// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    loadFarmData();

    setupSpeechRecognition();

    setupMicButton();

    setupScenarioSelector();

});


// ============================================================
// LOAD FARM DATA
// ============================================================

async function loadFarmData() {

    try {

        const response =
            await fetch("farmData.json");

        if (!response.ok) {
            throw new Error("Could not load farmData.json");
        }

        farmData =
            await response.json();

        applyScenario(selectedScenario);

        updateVelanStatus("Ready");

    } catch (error) {

        console.error(
            "Farm data error:",
            error
        );

        updateVelanStatus("Error");
    }
}


// ============================================================
// SCENARIO SELECTOR
// ============================================================

function setupScenarioSelector() {

    const selector =
        document.getElementById(
            "scenarioSelect"
        );

    if (!selector) {
        return;
    }

    selector.addEventListener(
        "change",
        () => {

            selectedScenario =
                selector.value;

            applyScenario(
                selectedScenario
            );

            updateVelanResponse(
                farmData.scenarios[
                    selectedScenario
                ].recommendation
            );

        }
    );
}


// ============================================================
// APPLY SCENARIO
// ============================================================

function applyScenario(scenarioKey) {

    if (!farmData) {
        return;
    }

    const scenario =
        farmData.scenarios[
            scenarioKey
        ];

    if (!scenario) {
        return;
    }


    document.getElementById(
        "scenarioName"
    ).textContent =
        scenario.name;


    document.getElementById(
        "scenarioDescription"
    ).textContent =
        scenario.description;


    document.getElementById(
        "temperature"
    ).textContent =
        scenario.temperature;


    document.getElementById(
        "soilMoisture"
    ).textContent =
        scenario.soilMoisture;


    document.getElementById(
        "rainChance"
    ).textContent =
        scenario.rainChance;


    document.getElementById(
        "motorStatus"
    ).textContent =
        scenario.motorStatus;


    document.getElementById(
        "weather"
    ).textContent =
        scenario.weather;


    document.getElementById(
        "crop"
    ).textContent =
        scenario.crop;


    document.getElementById(
        "recommendationText"
    ).textContent =
        scenario.recommendation;
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
            "Speech Recognition is not supported."
        );

        updateVelanStatus("Error");

        return;
    }


    recognition =
        new SpeechRecognition();


    // Tamil voice input.
    recognition.lang =
        "ta-IN";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    // ----------------------------------------
    // START
    // ----------------------------------------

    recognition.onstart = () => {

        isListening = true;

        updateVelanStatus(
            "Listening"
        );

        document
            .getElementById("micButton")
            .classList.add("active");
    };


    // ----------------------------------------
    // RESULT
    // ----------------------------------------

    recognition.onresult =
        async (event) => {

            const transcript =
                event.results[0][0]
                    .transcript
                    .trim();


            console.log(
                "Farmer:",
                transcript
            );


            if (!transcript) {

                updateVelanStatus(
                    "Ready"
                );

                return;
            }


            updateFarmerQuestion(
                transcript
            );


            isListening = false;


            document
                .getElementById("micButton")
                .classList.remove("active");


            await processFarmerRequest(
                transcript
            );
        };


    // ----------------------------------------
    // ERROR
    // ----------------------------------------

    recognition.onerror =
        (event) => {

            console.error(
                "Speech recognition error:",
                event.error
            );


            isListening = false;


            document
                .getElementById("micButton")
                .classList.remove("active");


            if (
                event.error === "no-speech"
            ) {

                updateVelanStatus(
                    "Ready"
                );

                return;
            }


            updateVelanStatus(
                "Error"
            );
        };


    // ----------------------------------------
    // END
    // ----------------------------------------

    recognition.onend =
        () => {

            isListening = false;

            document
                .getElementById("micButton")
                .classList.remove("active");
        };
}


// ============================================================
// MICROPHONE
// ============================================================

function setupMicButton() {

    const micButton =
        document.getElementById(
            "micButton"
        );


    if (!micButton) {
        return;
    }


    micButton.addEventListener(
        "click",
        () => {

            // If Rime is currently speaking,
            // treat this click as an interruption.
            if (currentAudio) {

                interruptCurrentResponse();
            }


            if (!recognition) {

                updateVelanStatus(
                    "Error"
                );

                return;
            }


            if (isListening) {
                return;
            }


            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Recognition start:",
                    error.message
                );
            }
        }
    );
}


// ============================================================
// PROCESS FARMER REQUEST
// ============================================================

async function processFarmerRequest(
    question
) {

    updateVelanStatus(
        "Processing"
    );


    requestVersion++;

    const myRequestVersion =
        requestVersion;


    const responseText =
        generateVelanResponse(
            question
        );


    updateVelanResponse(
        responseText
    );


    await speakWithRime(
        responseText,
        myRequestVersion
    );
}


// ============================================================
// NORMALIZE
// ============================================================

function normalizeQuestion(
    question
) {

    return question
        .toLowerCase()
        .trim()
        .replace(/[!?.,]/g, "");
}


// ============================================================
// FARMING DECISION ENGINE
// ============================================================

function generateVelanResponse(
    question
) {

    if (!farmData) {

        return (
            "Farm data is currently unavailable. " +
            "Please try again."
        );
    }


    const text =
        normalizeQuestion(
            question
        );


    const scenario =
        farmData.scenarios[
            selectedScenario
        ];


    // ========================================================
    // IRRIGATION
    // ========================================================

    if (
        text.includes("thanni") ||
        text.includes("தண்ணி") ||
        text.includes("தண்ணீர்") ||
        text.includes("water") ||
        text.includes("irrigation") ||
        text.includes("paachan") ||
        text.includes("paachanuma")
    ) {

        return irrigationAdvice(
            scenario
        );
    }


    // ========================================================
    // RAIN
    // ========================================================

    if (
        text.includes("mazhai") ||
        text.includes("மழை") ||
        text.includes("rain")
    ) {

        return rainAdvice(
            scenario
        );
    }


    // ========================================================
    // SOIL
    // ========================================================

    if (
        text.includes("soil") ||
        text.includes("mannu") ||
        text.includes("மண்") ||
        text.includes("eeram") ||
        text.includes("ஈரம்")
    ) {

        return soilAdvice(
            scenario
        );
    }


    // ========================================================
    // MOTOR / PUMP
    // ========================================================

    if (
        text.includes("motor") ||
        text.includes("pump") ||
        text.includes("மோட்டார்")
    ) {

        return motorAdvice(
            scenario
        );
    }


    // ========================================================
    // FERTILIZER
    // ========================================================

    if (
        text.includes("fertilizer") ||
        text.includes("fertiliser") ||
        text.includes("uram") ||
        text.includes("உரம்")
    ) {

        return fertilizerAdvice(
            scenario
        );
    }


    // ========================================================
    // TODAY / GENERAL
    // ========================================================

    if (
        text.includes("innaikku") ||
        text.includes("inniku") ||
        text.includes("today") ||
        text.includes("enna pannanum") ||
        text.includes("enna seiyanum")
    ) {

        return overallAdvice(
            scenario
        );
    }


    // ========================================================
    // HELP
    // ========================================================

    if (
        text.includes("help") ||
        text.includes("enna kekalam") ||
        text.includes("what can you do")
    ) {

        return (
            "I can help you with irrigation, rain, " +
            "soil moisture, motor status, fertilizer, " +
            "and today's farm decisions."
        );
    }


    // ========================================================
    // UNRELATED / DEFAULT
    // ========================================================

    return (
        "I am designed for farming questions. " +
        "Ask me about water, rain, soil, fertilizer, " +
        "or your field."
    );
}


// ============================================================
// IRRIGATION ADVICE
// ============================================================

function irrigationAdvice(
    scenario
) {

    if (
        scenario.soilMoisture === "Low" &&
        scenario.rainChance === "10%"
    ) {

        return (
            "The soil moisture is low and rain is unlikely. " +
            "Irrigation is recommended today."
        );
    }


    if (
        scenario.rainChance === "80%"
    ) {

        return (
            "Rain is expected soon, so avoid unnecessary irrigation. " +
            "Check the field again after the rain."
        );
    }


    return (
        "The soil moisture is already high. " +
        "Irrigation is not needed right now."
    );
}


// ============================================================
// RAIN ADVICE
// ============================================================

function rainAdvice(
    scenario
) {

    if (
        scenario.rainChance === "80%"
    ) {

        return (
            "Rain is expected with an eighty percent chance. " +
            "Avoid unnecessary irrigation today."
        );
    }


    if (
        scenario.rainChance === "40%"
    ) {

        return (
            "There is a moderate chance of rain. " +
            "Monitor the field before deciding on irrigation."
        );
    }


    return (
        "Rain is unlikely at the moment. " +
        "Monitor the soil moisture and irrigate only if needed."
    );
}


// ============================================================
// SOIL ADVICE
// ============================================================

function soilAdvice(
    scenario
) {

    return (
        `Current soil moisture is ${scenario.soilMoisture}. ` +
        `The temperature is ${scenario.temperature}.`
    );
}


// ============================================================
// MOTOR ADVICE
// ============================================================

function motorAdvice(
    scenario
) {

    if (
        scenario.soilMoisture === "Low" &&
        scenario.rainChance === "10%"
    ) {

        return (
            "The soil is dry and rain is unlikely. " +
            "The irrigation motor can be turned on."
        );
    }


    if (
        scenario.rainChance === "80%"
    ) {

        return (
            "Rain is expected soon. " +
            "Keep the irrigation motor off for now."
        );
    }


    return (
        "The soil has enough moisture. " +
        "Keep the irrigation motor off for now."
    );
}


// ============================================================
// FERTILIZER ADVICE
// ============================================================

function fertilizerAdvice(
    scenario
) {

    if (
        scenario.soilMoisture === "High"
    ) {

        return (
            "The soil already has sufficient moisture. " +
            "Avoid applying fertilizer immediately and monitor the field."
        );
    }


    return (
        "Before applying fertilizer, check soil and crop conditions. " +
        "Do not apply more fertilizer than required."
    );
}


// ============================================================
// OVERALL ADVICE
// ============================================================

function overallAdvice(
    scenario
) {

    return (
        `Today the temperature is ${scenario.temperature}, ` +
        `soil moisture is ${scenario.soilMoisture}, ` +
        `and rain chance is ${scenario.rainChance}. ` +
        `${scenario.recommendation}`
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

        updateVelanStatus(
            "Speaking"
        );


        const response =
            await fetch(
                "/api/tts",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        text: text
                    })
                }
            );


        // Ignore stale request
        if (
            myRequestVersion !==
            requestVersion
        ) {

            return;
        }


        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "Rime TTS error:",
                errorText
            );

            updateVelanStatus(
                "Error"
            );

            return;
        }


        const audioBlob =
            await response.blob();


        // Check again before playback
        if (
            myRequestVersion !==
            requestVersion
        ) {

            return;
        }


        const audioUrl =
            URL.createObjectURL(
                audioBlob
            );


        const audio =
            new Audio(audioUrl);


        currentAudio =
            audio;


        audio.onended = () => {

            URL.revokeObjectURL(
                audioUrl
            );


            if (
                currentAudio ===
                audio
            ) {

                currentAudio =
                    null;

                updateVelanStatus(
                    "Ready"
                );
            }
        };


        audio.onerror = () => {

            URL.revokeObjectURL(
                audioUrl
            );


            if (
                currentAudio ===
                audio
            ) {

                currentAudio =
                    null;

                updateVelanStatus(
                    "Error"
                );
            }
        };


        await audio.play();

    } catch (error) {

        console.error(
            "Rime playback error:",
            error
        );

        currentAudio =
            null;

        updateVelanStatus(
            "Error"
        );
    }
}


// ============================================================
// INTERRUPTION
// ============================================================

function interruptCurrentResponse() {

    console.log(
        "VELAN response interrupted."
    );


    // Invalidate previous request.
    requestVersion++;


    // Stop active audio.
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


        currentAudio =
            null;
    }


    updateVelanStatus(
        "Interrupted"
    );
}


// ============================================================
// STATUS UI
// ============================================================

function updateVelanStatus(
    status
) {

    const statusText =
        document.getElementById(
            "statusText"
        );

    const statusMessage =
        document.getElementById(
            "statusMessage"
        );

    const statusDot =
        document.getElementById(
            "statusDot"
        );


    if (
        !statusText ||
        !statusMessage ||
        !statusDot
    ) {

        return;
    }


    statusText.textContent =
        status;


    statusDot.className =
        "status-dot";


    if (
        status === "Ready"
    ) {

        statusMessage.textContent =
            "Tap the microphone and ask VELAN about your farm.";

        statusDot.classList.add(
            "ready"
        );
    }


    else if (
        status === "Listening"
    ) {

        statusMessage.textContent =
            "VELAN is listening to the farmer...";

        statusDot.classList.add(
            "listening"
        );
    }


    else if (
        status === "Processing"
    ) {

        statusMessage.textContent =
            "VELAN is analysing the current farm context...";

        statusDot.classList.add(
            "processing"
        );
    }


    else if (
        status === "Speaking"
    ) {

        statusMessage.textContent =
            "VELAN is speaking through Rime...";

        statusDot.classList.add(
            "speaking"
        );
    }


    else if (
        status === "Interrupted"
    ) {

        statusMessage.textContent =
            "Previous response stopped. Listening for your updated request...";

        statusDot.classList.add(
            "interrupted"
        );
    }


    else if (
        status === "Error"
    ) {

        statusMessage.textContent =
            "Something went wrong. Please try again.";

        statusDot.classList.add(
            "error"
        );
    }
}


// ============================================================
// FARMER QUESTION
// ============================================================

function updateFarmerQuestion(
    question
) {

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
// VELAN RESPONSE
// ============================================================

function updateVelanResponse(
    response
) {

    const element =
        document.getElementById(
            "velanResponse"
        );


    if (element) {

        element.textContent =
            response;
    }


    const recommendation =
        document.getElementById(
            "recommendationText"
        );


    if (recommendation) {

        recommendation.textContent =
            response;
    }
}