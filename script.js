document.addEventListener("DOMContentLoaded", () => {

    loadFarmData();

});


async function loadFarmData() {

    try {

        const response = await fetch("farmData.json");

        const data = await response.json();

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

    catch (error) {

        console.error("Unable to load farm data:", error);

    }

}


/*
    PERSON 1 INTEGRATION GUIDE

    Person 1 can call:

    updateVelanStatus("Listening");
    updateVelanStatus("Processing");
    updateVelanStatus("Speaking");
    updateVelanStatus("Interrupted");

*/


function updateVelanStatus(status) {

    const statusText =
        document.getElementById("statusText");

    const statusMessage =
        document.getElementById("statusMessage");

    statusText.textContent = status;


    if (status === "Listening") {

        statusMessage.textContent =
            "VELAN is listening to the farmer...";

    }

    else if (status === "Processing") {

        statusMessage.textContent =
            "VELAN is analysing your farm conditions...";

    }

    else if (status === "Speaking") {

        statusMessage.textContent =
            "VELAN is providing farming guidance...";

    }

    else if (status === "Interrupted") {

        statusMessage.textContent =
            "Previous response cancelled. Listening for new instructions...";

    }

    else {

        statusMessage.textContent =
            "Tap the microphone and ask VELAN anything about your farm.";

    }

}


/*
    Person 1 can also update:

    document.getElementById("farmerQuestion").textContent = userQuestion;

    document.getElementById("velanResponse").textContent = aiResponse;

*/