let isRequestRunning = false; //Used to ensure only one request is going at a time.

async function pollServerGPSData() {
    /*
    const RTKFixValues = {
        0: "No Fix",
        1: "GPS Only",
        2: "DGPS",
        4: "RTK Fixed",
        5: "RTK Float",
        6: "Estimated"
    }
    */


    if (isRequestRunning) return; //Return if request is already running

    isRequestRunning = true;

    try {
        const response = await fetch("/GPSData");
        const data = await response.json();
        $("#longditudeValue").html(String(data.longditude.toFixed(2)) + "°"); //longditude
        $("#latitudeValue").html(String(data.latitude.toFixed(2)) + "°"); //latitude
        $("#altitudeValue").html(String(data.altitude.toFixed(2)) + " metres"); //altitude
        $("#accuracyValue").html(String(data.accuracy.toFixed(0)) + " mm"); //accuracy
        $("#sattelitesValue").html(String(data.sats)); //number of satelites
        $("#hdopValue").html(String(data.hdop)); //hdop
        $("#correctionAgeValue").html(String(data.corr_age)); //correction age
        $("#savedPointsValue").html(String(data.point_count)); //Number of points saved
        $("#RTKFixValue").html(data.RTKFix);
        $("#metAccuracyTargetValue").html(data.metAccuracyTarget);
        //console.log("Polling server");
    } catch (error) {
        console.error("polling error:", error);
    } finally {
        isRequestRunning = false; //Reset the flag
        setTimeout(pollServerGPSData, 500); //Recurse the function
    }
}
