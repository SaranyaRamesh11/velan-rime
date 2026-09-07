let farmData = null;

document.addEventListener("DOMContentLoaded", loadFarmData);

async function loadFarmData() {
    try {
        const response = await fetch("farmData.json");

        if (!response.ok) {
            throw new Error("Could not load farmData.json");
        }

        farmData = await response.json();

        const irrigation = farmData.scenarios.irrigation;

        updateFarmDisplay(irrigation);
        updateVelanStatus("Ready");

    } catch (error) {
        console.error("Farm data loading error:", error);

        updateVelanStatus("Error");

        document.getElementById("statusMessage").textContent =
            "Unable to load farm data.";
    }
}

function updateFarmDisplay(data) {
    document.getElementById("temperature").textContent =
        data.temperature;

    document.getElementById("soilMoisture").textContent =
        data.soilMoisture;

    document.getElementById("motorStatus").textContent =
        data.motorStatus;

    document.getElementById("weather").textContent =
        data.weather;

    document.getElementById("velanResponse").textContent =
        data.recommendation;
}

function updateVelanStatus(status) {
    const statusText = document.getElementById("statusText");
    const statusMessage = document.getElementById("statusMessage");
    const statusDot = document.querySelector(".status-dot");

    statusText.textContent = status;

    statusDot.className = "status-dot";

    if (status === "Ready") {
        statusMessage.textContent =
            "Tap the microphone and ask VELAN about your farm.";
        statusDot.classList.add("ready");
    }

    else if (status === "Listening") {
        statusMessage.textContent =
            "VELAN is listening to the farmer...";
        statusDot.classList.add("listening");
    }

    else if (status === "Processing") {
        statusMessage.textContent =
            "VELAN is analysing your farm conditions...";
        statusDot.classList.add("processing");
    }

    else if (status === "Speaking") {
        statusMessage.textContent =
            "VELAN is speaking...";
        statusDot.classList.add("speaking");
    }

    else if (status === "Interrupted") {
        statusMessage.textContent =
            "Response interrupted. Listening for your new request...";
        statusDot.classList.add("interrupted");
    }

    else if (status === "Error") {
        statusMessage.textContent =
            "Something went wrong. Please try again.";
        statusDot.classList.add("error");
    }
}

function updateFarmerQuestion(question) {
    document.getElementById("farmerQuestion").textContent = question;
}

function updateVelanResponse(response) {
    document.getElementById("velanResponse").textContent = response;
}
// -----------------------------
// BASIC MIC BUTTON UI
// Person 1 will replace/connect this
// with actual speech recognition.
// -----------------------------

const micButton = document.getElementById("micButton");

if (micButton) {
    micButton.addEventListener("click", () => {

        updateVelanStatus("Listening");

        micButton.classList.add("active");

        setTimeout(() => {
            micButton.classList.remove("active");
        }, 1500);
    });
}