

















window.gpsPoller = window.gpsPoller || null;

$(document).ready(function(){
    if (!window.gpsPoller) {
        window.gpsPoller = new GPSPoller(500);
    }
    window.gpsPoller.start();
    populateMapMenu();
});

$(document).off("click", "#CSVButton").on("click", "#CSVButton", async function () {
    console.log("Posting CSV Write Request to server");

    try {
        const data = await $.ajax({
            url: '/writeCSVDataPoint',
            type: 'POST'
        });

        console.log(data ? "CSV Write successful" : "CSV Write failed");
    } catch (err) {
        console.error("AJAX error:", err);
    }
});

$(document).off("click", "#return").on("click", "#return", async function () {
    window.gpsPoller.stop();
    navigateToPage("mainMenu");
});


async function populateMapMenu() {
    console.log("Polling for map mode menu items");
    $.ajax({
        url: '/mapMenuOptions',
        type: 'GET',
        success: function(data) {
            //Inject HTML into a container
            $('#menuSpecificOptions').html(data);
        },
        error: function(xhr, status, error) {
            console.error("AJAX error:" + status + error);
        }
    });
}

if (!window.GPSPoller) {
    window.GPSPoller = class GPSPoller {
        constructor(interval) {
            this.interval = interval;
            this.isRequestRunning = false;
            this.timer = null;
            this.isStopped = false;
        }

        async pollServerGPSData() {
            if (this.isRequestRunning) return;
            if (this.isStopped) return;

            this.isRequestRunning = true;

            $.ajax({
                url: "/mapGPSData",
                type: "GET",
                dataType: "json",
                success: (data) => {
                    console.log(data);
                    $("#longitudeValue").html(data.longitude.toFixed(2) + "°");
                    $("#latitudeValue").html(data.latitude.toFixed(2) + "°");
                    $("#altitudeValue").html(data.altitude.toFixed(2) + " metres");
                    $("#sattelitesValue").html(data.satellites);
                    $("#hdopValue").html(data.hdop);
                    $("#RTKFixValue").html(data.fix);
                },
                error: (xhr, status, error) => {
                    console.error("Polling error: " + status + error);
                },
                complete: () => {
                    this.isRequestRunning = false;
                    if (!this.isStopped) {
                        this.timer = setTimeout(() => this.pollServerGPSData(), this.interval);
                    }
                }
            });
        }

        start() {
            this.isStopped = false; // important if reused
            this.pollServerGPSData();
        }

        stop() {
            this.isStopped = true;
            if (this.timer) clearTimeout(this.timer);
        }
    };
}

