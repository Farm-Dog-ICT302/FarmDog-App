//Class that handles the options menu
class OptionsMenu {

    static menuOpenClose() {
        if (!$("#menu").is(":animated")) {
            if ($("#menu").is(":hidden")) {
                $("#menu").show("1000");
            } else {
                $("#menu").hide("1000");
            }
        }
    }

    static darkModeToggle() {
        if ($("#darkModeCheckbox").is(":checked")) {
            $("html").attr('data-theme', 'dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            $("html").attr('data-theme', 'light');
            localStorage.setItem('darkMode', 'false');
        }
    }

}


//Class that handles getting the HTML of the subviews
class PageNavHandler {

    //A simple async static function to change the HTML of the page div object
    static async navigateToPage(pageName) {
        //Sets page name in local storage
        localStorage.setItem("page", pageName);

		//Set page title
		switch(pageName) {
			case "mainMenu":
				$("#contentTitle").html("Main Menu");
				break;
			case "findMode":
				$("#contentTitle").html("Find Mode");
				break;
			case "mapMode":
				$("#contentTitle").html("Map Mode");
				break;
		}

        //Wipe the options menu
        PageNavHandler.wipeMenu();

        //Console logger
        console.log("polling /" + pageName);

        //Ajax get request for the html of the requested subview
        $.ajax({
            url: '/' + pageName,
            type: 'GET',
            success: function(data) {
                //Inject HTML into the main content container
                $('#mainContent').html(data);
            },
            error: function(xhr, status, error) {
                console.error("AJAX error:" + status + error);
            }
        });
    }

    //A simple function that wipes the options menu on page change so page specific options are removed on page translation
    static wipeMenu() {
        console.log("wiping menu items");
        $('#menuSpecificOptions').html("");
    }

}

//Class responsible for initiating the page, run whenever the page is refreshed
class AppInitiator {

    constructor(app) {
        this.app = app;
    }

    //Initiate all of the page settings stored in the browser local storage
    initiate() {
        this.pageCheck();
        this.darkModeCheck();
    }

    //Checks to see the page that they were on last and returns to it upon refresh
    async pageCheck() {
        PageNavHandler.wipeMenu();
        console.log("PAGE CHECK");
        console.log("This is the page right after refresh" + localStorage.getItem("page"));
        switch(localStorage.getItem("page")) {
            case "mapMode":
                this.app.navigateToMapMode();
                break;
            case "trackMode":
                this.app.navigateToTrackMode();
                break;
            case "mainMenu":
                this.app.navigateToMainMenu();
                break;
            default:
                console.log("Default activated moving to main menu");
                this.app.navigateToMainMenu();
                break;
        }
    }

    //Checks to see if the dark mode is set in localstorage
    async darkModeCheck() {
        console.log("DARK MODE CHECK");
        if (localStorage.getItem('darkMode') === 'true') {
            $("html").attr('data-theme', 'dark');
        }
    }

}

//A class that returns various settings dictionaries
//class SettingsGetter {

    //Get settings for map mode
    //static getMapModeSettings() {
        //let backendDataNames = ["longditude","latitude","altitude","accuracy","RTKFix","sattelites","hdop","correctionAge","savedPoints", "metAccuracyTarget", "notes"];
        //let settingsDictionary = {};
        //Loop for each of the map menu
        //backendDataNames.forEach((name) => {
        //    settingsDictionary[name] = localStorage.getItem(name);
        //});
        //return settingsDictionary;

   //}

//}

//A class responsible for the activation and deactivation of the button listeners for every page
class ButtonListeners {
    //Constructor that pulls in the main app so it can interact with it and its variables
    constructor(app) {
        this.app = app;
        this.activateOptionsListeners();
    }

    activateOptionsListeners() {

        console.log("Options menu active");

        $(document).on("click","#menuButton", () => {
            console.log("Open/Close the menu");
            OptionsMenu.menuOpenClose();
        });

        $(document).off("change", "#darkModeCheckbox").on("change","#darkModeCheckbox", () => {
            OptionsMenu.darkModeToggle();
        });

    }

    //MAIN MENU LISTENERS//
    mainMenuListeners() {

        // Remove old listeners to prevent duplicates
        this.deactivateNonMainMenuModeListeners();

        //activate listeners
        $(document).off("click","#mapModeButton").on("click","#mapModeButton", () => {
            console.log("to map mode");
            this.app.navigateToMapMode();
        });

        $(document).off("click","#trackModeButton").on("click","#trackModeButton", () => {
            this.app.navigateToTrackMode();
        });

        
        $(document).off("click", "#quit").on("click", "#quit", () => {

            if (confirm("Are you sure you want to quit the Farm Dog?")) {
                $.ajax({
                    url: "/quit",
                    type: "POST",
                    success: () => {
                        document.body.innerHTML = "<h2 style='color:white; text-align:center; margin-top:40vh'>\n\nFarm Dog Shutting down...</h2>";
                        console.log("Quit signal sent to server");
                    }, error: () => {
                        alert("Error sending quit signal to server, close browser window to quit");
                    }
                });
            }

        });
    }

    //MAP MODE LISTENERS//
    mapModeListeners() {

        this.deactivateMainMenuListeners();

        //activate listeners
        $(document).off("click", "#return").on("click","#return", () => {
            this.app.navigateToMainMenu();
        });

        $(document).off("click", "#CSVButton").on("click","#CSVButton", () => {
            console.log("writing to CSV");
            this.app.mapModeHandler.csvWriter.write();
        });

    }

    //TRACK MODE LISTENERS//
    trackModeListeners() {

        this.deactivateMainMenuListeners();

        $(document).off("click", "#return").on("click","#return", () => {
            this.app.navigateToMainMenu();
        });

    }

    //DEACTIVATION
    //Main Menu
    deactivateMainMenuListeners() {
        $(document).off("click", "#mapModeButton");
        $(document).off("click", "#trackModeButton");
        $(document).off("click", "#quit");
    }

    //Everything else
    deactivateNonMainMenuModeListeners() {
        //if($('#return').length){
        //    $(document).off("click", "#return");
        //}

        //if($('#CSVButton').length){
        //    $(document).off("click", "#CSVButton");
        //}

         //$(document).off("click", "#quit");

         $(document).off("click", "#return");
         $(document).off("click", "#CSVButton");

    }

}



//Main app class
class MainApp {

    //Constructor
    constructor() {
        //Activate and deactivate button listeners based on calls from the main app.
        this.buttonListeners = new ButtonListeners(this);

        //Initiate page specific classes defined in their own files
        this.mapModeHandler = new MapModeApp(); //see mapMode.js
        this.trackModeHandler = new TrackModeApp(); //see trackmode.js

        //Run the initiation sequence for the app
        this.appInitiator = new AppInitiator(this);
        this.appInitiator.initiate();





        //Get the map settings from localStorage
        //this.mapModeSettings = SettingsGetter.getMapModeSettings();

    }

    //Activates the main menu sub page
    navigateToMainMenu() {

        //Move to the page
        PageNavHandler.navigateToPage("mainMenu");

        //Activate listeners
        this.buttonListeners.mainMenuListeners();

        //Stop track mode handler if it is running
        if (this.trackModeHandler.isRunning === true) {
            this.trackModeHandler.stop();
        }

        //Stop map mode handler if it is running
        if (this.mapModeHandler.isRunning === true) {
            this.mapModeHandler.stop();
        }
    }

    //Activates the map mode sub page
    navigateToMapMode() {
        //Move to the page

        $.ajax({
            url: ' /mapMode',
            type: 'GET',
            success: (data) => {
                $('#mainContent').html(data);
                //Activate listeners
                this.buttonListeners.mapModeListeners();
                //Start map mode handler
                this.mapModeHandler.start();
            }
        });

        //PageNavHandler.navigateToPage("mapMode");
        //Activate listeners
        //this.buttonListeners.mapModeListeners();
        //Start map mode handler
        //this.mapModeHandler.start();

        localStorage.setItem("page", "mapMode");
		$("#contentTitle").html("Map Mode");
        PageNavHandler.wipeMenu();

    }

    //Activates the track mode sub page
    navigateToTrackMode() {

        $.ajax({
            url: ' /trackMode',
            type: 'GET',
            success: (data) => {
                $('#mainContent').html(data);
                this.buttonListeners.trackModeListeners();
                this.trackModeHandler.start();
            }
        });


        //Move to the page
        //PageNavHandler.navigateToPage("trackMode");
        //Activate listeners
        //this.buttonListeners.trackModeListeners();
        //Start track mode handler
        //this.trackModeHandler.start();

        localStorage.setItem("page", "trackMode");
		$("#contentTitle").html("Find Mode");
        PageNavHandler.wipeMenu();
    }

}

var mainApp = new MainApp();
