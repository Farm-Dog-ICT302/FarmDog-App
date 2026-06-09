

class UIMapClass{
    //Function that updates the values with the provided data
    static updateUI(data) {
        //Simple for loop to maintain compatibility with legacy hardware
        //The loop loops through all the GPS data and updates each individual value box
        for (const [key, value] of Object.entries(data)) {
            const element = $("#" + key + "Value");
            //make sure that the value element actually exists
            if (element.length) {
                let display = value;
                //If the value is a number, round it to 2 decimal places for display
                if (typeof value === "number") {
                    if (key == 'latitude' || key == 'longitude') {
                        display = value.toFixed(8) + "°";
                    } else if (key == 'altitude') {
                        display = value.toFixed(2) + "m";
                    } else if (key == 'hdop') {
                        display = value.toFixed(2);
                    } else if (key == 'fix') {
                        switch (value) {
                            case 1:
                                display = "1 - Standard GPS (Meter)";
                                element.css("color","red");
                                break;
                            case 2:
                                display = "4 - DGPS (Decimeter)";
                                element.css("color","orange");
                                break;
                            case 3:
                                display = "3 - You should not be seeing this";
                                break;
                            case 4:
                                display = "4 - RTK Fixed (Centimeter)";
                                element.css("color","green");
                                break;
                            case 5:
                                display = "5 - RTK Float (Decimeter)";
                                element.css("color","orange");
                                break;
                        }
                    } else {
                        display = value;
                    }
                }
                element.html(String(display));
            }

        }
    }

    static toggleUIElement(elementId, isShown) {
        if (isShown) {
            $("#" + elementId).show();
            //localStorage.setItem(elementId, 'true');
        } else {
            $("#" + elementId).hide();
            //localStorage.setItem(elementId, 'false');
        }
    }

}

class MapModeMenuListener {

    listen() {
        $("#menuSpecificOptions").on("change", (event) => {
            if (event.target.classList.contains("mapMenuCheckbox")) {
                //get id of checkbox checked
                const checkboxId = event.target.id;
                //get ui element name by removing "checkbox" from the id string
                const element = checkboxId.slice(0, -8);
                UIMapClass.toggleUIElement(element, event.target.checked);
            }
        });
    }
}


//A class for polling the backend to recieve HTML data
class GPSPoller {

    //Constructor
    constructor(pollInterval = 500) {
        this.pollInterval = pollInterval;
        this.timer = null;
        this.isStopped = false;
        this.isRequestRunning = false;
    }

    //start the recursive polling function
    startPolling(callback) {
        //Check if already running
        if (!this.isStopped && this.timer) return;
        this.isStopped = false;
        this.isRequestRunning = false;

        const pollServerGPSData = () => {

            if (this.isRequestRunning) return;
            this.isRequestRunning = true;

            //Call to the server for specific information, providing the back end a latitude and a longditude target based on input
            $.ajax({
                url: "/mapGPSData",
                type: "GET",
                dataType: "json",
                success: (data) => {
                    //Send data to callback function
                    callback(data);
                    console.log(data);
                },
                error: (xhr, status, error) => {
                    console.error("Polling error: " + status + error);
                },
                complete: () => {
                    //Makes function recursive
                    this.isRequestRunning = false;
                    if (!this.isStopped) {
                        this.timer = setTimeout(() => pollServerGPSData(), this.pollInterval);
                    }
                }
            });
        };
        pollServerGPSData();
    }

    stopPolling() {
        this.isStopped = true;
        if (this.timer) clearTimeout(this.timer);
    }

}

//A class responsible for populating the page with HTML
class Populator {


    static populateAll() {
        this.populateMapMenu();
        this.populateDataView();
    }

    //A function that gets all of the menu items and puts them in the menu
    static populateMapMenu() {
        console.log("Polling for map mode menu items");
        //Ajax call to get the HTML menu string
        $.ajax({
            url: '/mapMenuOptions',
            type: 'GET',
            success: function(data) {
                //Inject HTML into the menu container
                $('#menuSpecificOptions').html(data);
            },
            error: function(xhr, status, error) {
                console.error("AJAX error:" + status + error);
            }
        });
    }

    //A function that gets all of the data view items and puts them in the display div
    static populateDataView() {
        //Ajax call to get the HTML data display string
        $.ajax({
            url: '/mapModeDataDisplay',
            type: 'GET',
            success: function(data) {
                //Inject HTML into the menu container
                $('#informationDisplay').html(data);
            },
            error: function(xhr, status, error) {
                console.error("AJAX error:" + status + error);
            }
        });
    }

}

class CSVWriter {
    write() {

        // Disable the button and show saving text
        $("#CSVButton").prop("disabled", true);
        $("#CSVButton").text("Saving...");

        $.ajax({
            url: '/csvWrite',
            type: 'POST',
            data: {note: $("#note").val()},
            success: (data) => {
                // Show acknowledgment to user
                alert("Point " + data.pointNumber + " saved!");
                // Clear note field
                $("#note").val("");
                //console.log(data);
            },
            error: () => {
                alert("Error saving point. Please try again.");
            },
            complete: () => {
                $("#CSVButton").prop("disabled", false);
                $("#CSVButton").text("Add Location to CSV");
            }
        });
    }
}


//Main app class
class MapModeApp {

    //Constructor
    constructor() {
        //Populates the map menu and data view
        Populator.populateAll();

        //Class responsible for GPSPolling
        this.gpsPoller = new GPSPoller();

        //Boolean for telling parent class whether or not the class is actively running
        this.isRunning = false;

        //CSV Writer Output
        this.csvWriter = new CSVWriter();
    }

    //Starts the mapMenuApp
    start() {
        //Flip the boolean to indicate the class instance is running
        this.isRunning = true;
        //Populate the data display again on the off chance that the back end has changed its data structure between the constructor and starting map mode
        Populator.populateAll();
        //Start the GPS server polling
        this.gpsPoller.startPolling((gpsData) => {
            UIMapClass.updateUI(gpsData);
        });

        this.menuListener = new MapModeMenuListener();
        this.menuListener.listen();

        //$("#CSVButton").on("click", () => {
        //    this.csvWriter.write();
        //});
    }

    //Stops the mapMenuApp
    stop() {
        this.gpsPoller.stopPolling();
    }

}
