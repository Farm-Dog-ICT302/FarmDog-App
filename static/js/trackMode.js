
// Helper function to turn raw azimuth degrees into human-readable directions 
function getDirectionText(distance, azimuth) { 

   if (distance < 0.025) return "Arrived at Target!";

   const sectors = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]; 

   const index = Math.round(((azimuth % 360) + 360) % 360 / 45) % 8; 

   return `${sectors[index]} (${azimuth.toFixed(1)}°)`; 

} 

 

// A class to handle getting the location from the server 
class LocationClass { 

   constructor(pollInterval = 500) { 

       this.pollInterval = pollInterval; 

       this.timer = null; 

       this.isStopped = false; 

       this.isRequestRunning = false; 

   } 

 

   startPolling(callback) { 

       if (!this.isStopped && this.timer) return; 

       this.isStopped = false; 

       this.isRequestRunning = false; 

 

       const pollServerGPSData = () => { 

           if (this.isRequestRunning) return; 

           this.isRequestRunning = true; 

           const lockedLat = $("#targetLat").data("locked"); 
           const lockedLon = $("#targetLon").data("locked"); 

           $.ajax({ 

               url: "/trackGPSData", 

               data: { 

                   targetLat: lockedLat !== undefined ? lockedLat.toString() : "0",  
                   targetLon: lockedLon !== undefined ? lockedLon.toString() : "0" 

               }, 

               type: "GET", 

               dataType: "json", 

               success: (data) => { 

                   callback(data); 

               }, 

               error: (xhr, status, error) => { 

                   console.error("Polling error: " + status + error); 

               }, 

               complete: () => { 

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

 

class CompassClass { 

   constructor() { 

       this.listener = null; 

   } 

 

   // Safe subscription registration method 
   registerListener(callback) { 

       const handleOrientation = (event) => { 

           // iOS native heading relative to magnetic north 
           let heading = event.webkitCompassHeading; 
		   
		   console.log("ios heading" + String(heading));

           // Android alternative sensor calculation fallback 
           if (heading === undefined || heading === null) { 

               if (event.alpha !== null && event.alpha !== undefined) { 

                   heading = (360 - event.alpha) % 360;  

               } else {
				   heading = 250;
			   }

           } 

           if (heading !== null && heading !== undefined) { 

               callback(heading); 

           }

       }; 

       if (typeof DeviceOrientationEvent === 'undefined') { 

           console.error('DeviceOrientationEvent is not supported on this device.'); 

           $("#compass").html("The compass is not supported by this device"); 

           return; 

       } 

       window.addEventListener('deviceorientation', handleOrientation); 

       this.listener = handleOrientation; 

   } 

   stopPolling() { 

       if (this.listener) { 

           window.removeEventListener('deviceorientation', this.listener); 

           this.listener = null; 

       } 

   } 

} 

class NavigationUtilitiesClass { 

   static degToRad(deg) { return deg * (Math.PI / 180); } 
   static radToDeg(rad) { return rad * (180 / Math.PI); } 

   static getArrowRotation(azimuth, phoneHeading) { 

       let rotation = azimuth - phoneHeading; 

       return (rotation + 360) % 360; 

   } 

}  

class UIClass { 

    constructor() {
        this.currentRotation = 0;
    }

    updateArrow(rotation) {

        //Calculate shortest path around circle
        let delta = rotation - this.currentRotation;

        if (delta > 180) {
            delta -= 360;
        } else if (delta < -180) {
            delta += 360;
        }

        this.currentRotation += delta;

		//console.log("arrow updating");
		//console.log(rotation);
		//console.log(`rotate(${rotation}deg)`);
		document.getElementById("arrow").style.transform = `translate(-50%, -50%) rotate(${this.currentRotation}deg)`;

   } 

}  

class TrackModeApp { 

   constructor() { 

       this.locationClass = new LocationClass(); 

       this.compassClass = new CompassClass(); 

       this.uiClass = new UIClass(); 

       this.currentLat = null; 

       this.currentLon = null; 

       this.isRunning = false; 

       this.currentAzimuth = 0.0; 

       this.targetSet = false; 

   } 

   start() { 

       this.isRunning = true; 

       // Find Target button click handler (Acts as the vital explicit User Gesture context) 
       $(document).off("click", "#findButton").on("click", "#findButton", () => { 

           const lat = parseFloat($("#targetLat").val()); 
           const lon = parseFloat($("#targetLon").val()); 

           if (isNaN(lat) || isNaN(lon)) { 

               $("#targetStatus").html("<span style='color: red;'>Invalid coordinates. Enter numbers.</span>"); 

               return; 

           } 

           if (lat < -90 || lat > 90 || lon < -180 || lon > 180) { 

               $("#targetStatus").html("<span style='color: red;'>Coordinates out of boundary range.</span>"); 

               return;  

           } 

           this.targetSet = true; 

           $("#targetLat").data("locked", lat); 
           $("#targetLon").data("locked", lon); 

           $("#targetStatus").html("<span style='color: green;'>Target set to (" + lat.toFixed(8) + "°, " + lon.toFixed(8) + "°)</span>"); 

           // CRITICAL FIX: Trigger permission authorization flow inside the user touch event thread 
           //this.initCompass(); 

       }); 

 
       $(document).off("click", "#saveSessionButton").on("click", "#saveSessionButton", () => {

            if (!confirm("Are you sure you want to save this current session and reset to point count to 1? "))

        return;

            $.ajax({
                url: "/saveSession",
                type: "POST",
                dataType: "json",
                success: (response) => {
                    if (response.success) {
                        $("#saveStatus").html("<span style='color: green;'>Session saved successfully! Count reset to 1.</span>");

                        // NEW ! Clear out old UI tracking states
                        $("#distanceValue").html("--");
                        $("#directionValue").html("Set target below ↓");
                        $("#targetLat").data("locked", undefined).val("");
                        $("#targetLon").data("locked", undefined).val("");
                        this.targetSet = false;

                        setTimeout(() => {
                            $("#saveStatus").html("");
                        }, 4000);
                    }
                },

                error: (xhr, status, error) => {
                    console.error("Error saving session: " + status + error);
                    $("#saveStatus").html("<span style='color: red;'>Error saving session. Try again.</span>");
                }
            });
       });

       // Start the GPS server polling loop 
       this.locationClass.startPolling((data) =>  {  

           if (!data || data.error) return; 

           if (typeof data.latitude === 'number') { 

               this.currentLat = data.latitude;  

               $("#latitudeValue").html(data.latitude.toFixed(8) + "°"); 

           } 

           if (typeof data.longitude === 'number') { 

               this.currentLon = data.longitude;  

               $("#longitudeValue").html(data.longitude.toFixed(8) + "°"); 

           } 

            // Cleaned and aligned RTK Fix diagnostic render
            if (typeof data.fix === 'number') {
                let fixText = "--";
                let fixColor = "red";

            if (data.fix === 4) { fixText = "4 - RTK Fixed (Centimeter)"; fixColor = "green"; }
            else if (data.fix === 5) { fixText = "5 - RTK Float (Decimeter)"; fixColor = "orange"; }
            else if (data.fix === 2) { fixText = "2 - DGPS (Sub-Metre)"; fixColor = "#DAA520"; }
            else if (data.fix === 1) { fixText = "1 - Standard GPS (Meter)"; fixColor = "red"; }
            else if (data.fix === 0) { fixText = "0 - No Fix (Invalid)"; fixColor = "darkred";}
            else { fixText = data.fix + " - Unknown State"; fixColor = "grey";}

                $("#fixValue").html(fixText).css("color", fixColor);
            
            }

           if (typeof data.distance === 'number' && !isNaN(data.distance) && this.targetSet) { 

               if (data.distance >= 1000) { 

                   $("#distanceValue").html((data.distance / 1000).toFixed(3) + " km"); 

               } else { 

                   $("#distanceValue").html(data.distance.toFixed(2) + " meters"); 

               } 

               if (typeof data.azimuth === 'number') { 

                   this.currentAzimuth = data.azimuth;  

                   const dir = getDirectionText(data.distance, data.azimuth);  

                   $("#directionValue").html(dir); 

               } 

           } else { 

               if (!this.targetSet) { 

                   $("#distanceValue").html("--"); 

                   $("#directionValue").html("Set target below ↓"); 

               } 

           } 

       }); 

       // Auto-initialize for Android/Desktop environments that do not require explicit click wrappers 
       if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') { 

           //this.initCompass(); 

       } 

   } 

 

   // Modular initialization execution engine 
   initCompass() { 

       if (typeof DeviceOrientationEvent === 'undefined') { 

           console.error('DeviceOrientationEvent is not supported on this device.'); 

           return; 

       } 

       const startCompassListening = () => { 
	   
		   console.log("starting compass listener");

           this.compassClass.stopPolling(); // Clear redundant bindings to prevent leaks 

           this.compassClass.registerListener((heading) => { 

               console.log("Heading:", heading);

               // Default to 0.0 azimuth if target isn't fully calculated yet so arrow spins relative to True North immediately 

               const rotation = NavigationUtilitiesClass.getArrowRotation( 

                   this.currentAzimuth || 70.0, 

                   heading 

               );

               console.log("Rotation:", rotation);

               this.uiClass.updateArrow(rotation); 

           }); 

       }; 

 

       // Handle strict Apple/iOS hardware permission constraints 
       if (typeof DeviceOrientationEvent.requestPermission === 'function') { 

           DeviceOrientationEvent.requestPermission() 

           .then(permissionState => { 

               if (permissionState === 'granted') { 

                   startCompassListening(); 

               } else { 

                   $("#targetStatus").append("<br><span style='color: orange;'>Compass hardware access denied.</span>"); 

               } 

           }) 

           .catch(console.error); 

       } else { 

           // Direct binding for non-permission-gated devices 
           startCompassListening(); 

       } 

   } 

   stop() { 

       this.locationClass.stopPolling(); 

       this.compassClass.stopPolling(); 

       this.isRunning = false; 

       $(document).off("click", "#findButton"); 

       $(document).off("click", "#saveSessionButton");

   } 

} 
