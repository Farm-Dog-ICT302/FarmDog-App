#Import all required modules
import serial
import pynmea2
import socket
import threading
import math
import csv
from datetime import datetime
import os
import time
from dataclasses import dataclass, asdict
from flask import Flask, render_template, jsonify, request
import sys
import random
from typing import Optional
from geographiclib.geodesic import Geodesic
import base64



#A data class holds all the settings for the GPS functions
@dataclass
class Config:
    gpsPort: str = '/dev/ttyACM0'
    baudRate: int = 115200
    baseIP: str = '192.168.255.10'  # Base Pi running RTKBASE
    basePort: int = 2101
    mountPoint: str = 'basestation'
    ntripUser: str = 'user-base'
    ntripPass: str = 'user-base'
    refreshSec: int = 1
    useMockGPS: bool = False         # flip to False when the rover Pi is connected

#A class that holds all the web server settings
@dataclass
class WebServerConfig:
    host: str = '0.0.0.0'
    port: int = 5000


#A dataclass that holds all the GPS data
@dataclass
class NMEAGPSData:
    #Data
    latitude:float
    longitude:float
    altitude:float
    fix:int
    satellites:int
    hdop:float


#A class that acts as a shared state between the GPS logic and the Webserver
class GPSState:
    
    def __init__(self):
        self._lock = threading.Lock()
        self._data: Optional[NMEAGPSData] = None #NMEAGPSData(0.0,0.0,0.0,0,0,0.0) until first fix

    def update(self, data: NMEAGPSData):
        with self._lock:
            self._data = data

    def get(self) -> Optional[NMEAGPSData]:
        with self._lock:
            return self._data

#A class that generates html based on the provided data structure so that the front end is less tied to specific data types
class HTMLGenerator:
    
    #Generates a html string based on its own data structure to send to the front end so that the front end is not tied to the structure of the data
    @staticmethod
    def generateMapModeDataViewHTML(orderArray, measurementArray):
        
        #Define the variable outside of the if statement and for loop statement
        htmlString = ""
        
        #Loops through the element names in the order array and the measurement strings in the measurement array
        for element, measurement in zip(orderArray, measurementArray):
            
            #Generates the HTML content
            htmlString += (
                
                f'<div id = "{element}" class = "mapModeDataDisplay">\n'
                f'  <div id = "{element}Label" class = "mapModeDataLabel">\n'
                f'      {element.capitalize()}\n'
                f'  </div>\n'
                f'  <div id = "{element}ValueView" class = "mapModeDataView">\n'
                f'      <div id = "{element}Value" class = "mapModeDataValue">\n'
                f'          0.0\n'
                f'      </div>\n'
                f'      <div id = "{element}Measurement" class = "mapModeData">\n'
                f'          {measurement}\n'
                f'      </div>\n'
                f'  </div>\n'
                f'</div>\n'
                )
            
        #Returns HTML string
        return htmlString

    #Generates a html string based on its own data structure to send to the front end so it is not tied to any specific data structure
    @staticmethod
    def generateMapModeMenuHTML(orderArray):
        
        #Start of the HTML menu
        htmlString = (
            
            '<div id = "showHideLabel">\n'
            '   Show/Hide Data:\n'
            '</div>\n'
            )
        
        #Loop through the array
        for element in orderArray:
            
            #Add a set of HTML elements to the htmlString variable
            htmlString += (
                f'<div id = "{element}Menu">\n'
                f'  {element.capitalize()} <input type="checkbox" id="{element}Checkbox" class = "mapMenuCheckbox" checked/>\n'
                f'</div>\n'
                )
        
        #return HTML string
        return htmlString


#A class that handles the GPS logic
class GPSLogicClass:
    
    def __init__(self, config: Config, gpsState: GPSState): #Constructor method
        
        self.config = config #import the config class
        self.serial : Optional[serial.Serial] = None # Serial connection to the GPS, will be set in the connect function
        self.gpsState = gpsState #Shared GPS data class
        self.stopFlag = False;

    #Define a method that will handle connecting to the GPS
    def connect(self) -> bool:
        
        try:
            
            self.serial = serial.Serial(
                
                self.config.gpsPort,
                self.config.baudRate,
                timeout = 1
                
            )
            
            return True
        
        #Capture error from trying to connect to GPS
        except Exception as e:
            
            print(f"Error connecting to GPS {e}")
            return False

    def threadStart(self): #Starts its functions in a separate thread
        
        thread = threading.Thread(target=self._run, daemon=True) #Daemon will kill this process when the main process is killed.
        thread.start();

    #Define a method that will handle reading the data from the GPS serial port
    def read(self):
        
        line = self.serial.readline().decode('utf-8', errors='ignore').strip() #Read the next line of the serial

        if '$GNGGA' not in line and '$GPGGA' not in line: #Check to see if it is an NMEA message
            return
            
        try:
            
            msg = pynmea2.parse(line)
        
        except pynmea2.ParseError as e:
                
            print(f"Error parsing NMEA message: {e}")
            return

        if msg.latitude is None or msg.longitude is None: #Check to see if the message contains the latitude and longitude
            return
                
        #return an instance of the NMWAGPSData dataclass
        data = NMEAGPSData(
            
            latitude = msg.latitude,
            longitude = msg.longitude,
            altitude = self._toFloat(getattr(msg, "altitude", 0)),
            fix = self._toInt(getattr(msg, "gps_qual", 0)),
            satellites = self._toInt(getattr(msg, "num_sats", 0)),
            hdop = self._toFloat(getattr(msg, "horizontal_dil", 0)),
            
        )
                
        #Update the shared GPS instance
        self.gpsState.update(data)

    @staticmethod
    def _toInt(value) -> int:
        
        try:
            
            return int(value) if value not in (None, '') else 0
        
        except (TypeError, ValueError):
            
            return 0
        
    @staticmethod
    def _toFloat(value) -> float:
        
        try:
            
            return float(value) if value not in (None, '') else 0.0
        
        except (TypeError, ValueError):
            
            return 0.0

    #start the GPSPolling loop
    def start(self):
        
        while not self.stopFlag:
            self.read()

    #stop the GPSPolling loop
    def stop(self):
        
        self.stopFlag = True;

    #Call the functions to connect the GPS then start the polling loop
    def _run(self):
        
        self.connect()
        self.start()

    #Sends corrections
    def sendCorrections(self, data):
        
        if self.serial:
            self.serial.write(data)


#A class that handles the RTK Correction logic
class RTKLogicClass:
    
    def __init__(self, config: Config, gpsLogicClass): #Constructor
        
        self.config = config
        self.gpsLogicClass = gpsLogicClass

    def threadStart(self): #Starts its functions in a separate thread
        
        thread = threading.Thread(target=self._run, daemon=True) #Daemon will kill this process when the main process is killed.
        thread.start();

    def _run(self):
        
        while True: #Infinite loop only killed when the main function is killed
            
            sock = None
            
            try:
                
                #Create a TCP client socket
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

                #Connect to the server
                sock.connect((self.config.baseIP, self.config.basePort))

                user_pass = f"{self.config.ntripUser}:{self.config.ntripPass}"

                clean_credentials = base64.b64encode(user_pass.encode('utf-8')).decode('utf-8')

                #Create the HTTP request
                request_str = (
                    
                    f"GET /{self.config.mountPoint} HTTP/1.0\r\n"
                    f"User-Agent: NTRIP FarmDog/1.0\r\n"
                    f"Authorization: Basic {clean_credentials}\r\n"
                    f"\r\n"
                    
                              )
                
                #Send the request
                #sock.send(request_str.encode())

                print(f"Transmitting Handshake: {request_str}")

                sock.sendall(request_str.encode('utf-8'))

                #Check the respose line
                response = sock.recv(1024)
                print(f"Base Station Response: {response.decode('utf-8', errors='ignore')}")

                while True:
                    
                    data = sock.recv(1024) #Read up to 1024 bytes from the server

                    if not data: #Check if server closed the connection
                        break
                    
                    #Debug line
                    print(f"Debug: Received {len(data)} bytes of correction data")
                    

                    self.gpsLogicClass.sendCorrections(data) #Send data to the class responsible for handling GPS logic

            except Exception as e: #Error handling
                
                print(f"RTK error: {e} - retrying in 2 seconds...")
                time.sleep(2)
                
            finally:
                
                if sock is not None:
                    
                    try:
                        
                        sock.close()
                        
                    except Exception:
                        
                        pass
                        #print(f"Error closing socket: {e}")


#A class for calculating distance between two GPS co-ordinates and returning a directional hint
class GeoCalculator:

    @staticmethod #Static so there is no need to create an instance. This function calculates the arc distance between two points.
    def distanceBetweenCoordinates(lat1, lon1, lat2, lon2) -> float: #Now with geodesic so that it can maintain the cm accuracy
        
        return Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)["s12"]

    @staticmethod
    def azimuthBetweenCoordinates(lat1, lon1, lat2, lon2) -> float:
        
        return Geodesic.WGS84.Inverse(lat1, lon1, lat2, lon2)["azi1"]

#A class for handling the writing of the CSV file
class CSVWriter:
    
    HEADERS = ["count","latitude","longitude","altitude","fix","satellites","hdop","Note"] #Headers for the CSV file
    
    def __init__(self, folderPath: str): #Constructor creates a new csv file at the path
        
        self.count = 0
        
        #Set folder path for the duration of the CSVWriter instance and make it if it doesn't exist
        self.folderPath = folderPath
        
        #Make the folder if it doesn't exist
        os.makedirs(self.folderPath, exist_ok=True)
        
        #Sets the filepath
        self.filePath = self._resolveFilePath()
        
        #Creates the CSV file with appropriate headers
        self.createFile()

    #function to determine the nearest available filePath
    def _resolveFilePath(self) -> str:
        
        #Initial file name
        baseName = datetime.now().strftime('Survey_%d-%m-%Y_%H-%M-%S')
        candidate = os.path.join(self.folderPath, f"{baseName}.csv")
        #tempFilePath = self.folderPath + "/" + fileName
        
        #Count for the attempts to find a clear file
        attemptCount = 0
        
        #Check if file already exists when initialising the class to make sure no data is overwritten
        while os.path.isfile(candidate):
                
            attemptCount += 1

            candidate = os.path.join(self.folderPath, f"{baseName}_{attemptCount}.csv")

        if attemptCount > 0:

            print(f"File already exists, exporting instead to {candidate}")
            
        return candidate

    #Function to create a blank CSV file with the provided headers
    def createFile(self):
        
        with open(self.filePath, mode='w', newline='', encoding='utf-8') as csvFile:

           csv.writer(csvFile).writerow(self.HEADERS)


    #Function to write the provided data to the CSV file
    def write(self, data):
        
        print(f"Writing point {self.count + 1} to {self.filePath}")
        
        with open(self.filePath, mode='a', newline='', encoding='utf-8') as csvFile:

            #Create the writer inside the with block to ensure
            #it is properly closed after writing
            writer = csv.writer(csvFile)
            writer.writerow(data)

            #Force the data to be written to disk immediately
            csvFile.flush()
            os.fsync(csvFile.fileno())
            
        self.count += 1

    #Function to start new file name and drops back to 0
    def resetSession(self):

        self.count = 0
        self.filePath = self._resolveFilePath()
        self.createFile()

        print(f"New session initialised. File created at: {self.filePath}")

    #Function to provide the current entry count
    def getCount(self) -> int:
        
        return self.count
    
    #Function to list all saved points
    def listSavedPoints(self):
        
        points = []
        
        if not os.path.isdir(self.folderPath):

            print(f"Folder {self.folderPath} does not exist.")

            return points
        
        filenames = sorted (
            
            (csvFile for csvFile in os.listdir(self.folderPath) if csvFile.endswith('.csv')),
            reverse=True,
            
        )
        
        for filename in filenames:
            
            filepath = os.path.join(self.folderPath, filename)
            
            try: 
                
                with open(filepath, mode='r', newline='', encoding='utf-8') as csvFile:
                    
                    reader = csv.DictReader(csvFile)
                    
                    for row in reader:
                        
                        points.append(self._rowToPoint(row, filename))
                        
            except (OSError, csv.Error) as e:
                
                print(f"Error unreadable file {filepath}: {e}")
                continue
            
        return points
    
    #Function to convert single CSV row and with note
    @staticmethod
    def _rowToPoint(row, filename):
        
        note = (row.get('Note') or row.get('note') or '').strip()
        
        try:
            
            lat = float(row.get('latitude', 0))
            lon = float(row.get('longitude', 0))
        
        except (TypeError, ValueError):
            
            lat, lon = 0.0, 0.0
            
        dateLabel = filename.rsplit('.', 1)[0]  # Remove .csv extension
        
        if note:
            
            label = f"{note} ({dateLabel})"
            
        else:
            
            label = f"{lat:.6f}, {lon:.6f} ({dateLabel})"
            
        return {
            
            "id": f"{filename}:{row.get('count', '')}",
            "count": row.get('count', ''),
            "latitude": lat,
            "longitude": lon,
            "note": note,
            "label": label,
            "sourceFile": filename,
            
        }


#A class for handling the locate mode
class TrackMode:

    @staticmethod
    def generateTrackModeJSON(gpsData: Optional[NMEAGPSData], targetLat, targetLon):
        
        if gpsData is None:
            
            return jsonify({"error" : "no GPS data available"}), 503
        
        #else:
            
        try:
            
            targetLat = float(targetLat)
            targetLon = float(targetLon)

        except (TypeError, ValueError):
            
            return jsonify({"error": "invalid or missing target coordinates"}), 400

        distance = GeoCalculator.distanceBetweenCoordinates(
            
            gpsData.latitude,
            gpsData.longitude,
            targetLat,
            targetLon
            
        )

        azimuth = GeoCalculator.azimuthBetweenCoordinates(
            
            gpsData.latitude,
            gpsData.longitude,
            targetLat,
            targetLon
            
        )

        gpsDataDict = {
            
            "latitude": gpsData.latitude,
            "longitude": gpsData.longitude,
            "distance": distance,
            "azimuth": azimuth,
            "fix": gpsData.fix

        }

        return jsonify(gpsDataDict)


#A class for handling the map mode
class MapMode:
    
    @staticmethod
    def generateMapModeJSON(gpsData: Optional[NMEAGPSData], savedPoints):
        
        #Return 404 if no data
        if gpsData is None:
            
            return jsonify({"error" : "no GPS data available"}), 503

        #Generate dictionary from gpsData
        gpsDataDict = asdict(gpsData)

        #Add the number of saved points
        gpsDataDict["savedPoints"] = savedPoints

        #Return the dictionary
        return jsonify(gpsDataDict)



#A class for handling the FLASK webserver, as the main interface goes through this it acts as the main routing hub for user input and gps output
class FlaskWebServerClass():
    
    def __init__(self, config: WebServerConfig, gpsState: GPSState): #Constructor
        
        self.config = config #The config class
        self.app = Flask(__name__) #The flask app itself
        self.gpsState = gpsState #Shared GPS data class
        self.logger = CSVWriter("output") #Create the CSV file writer


        #GPS Data structure
        self.GPSDataOrder = ["latitude", "longitude", "altitude", "fix", "satellites", "hdop"] #Order that the elements should be displayed
        self.GPSDataMeasurement = measurement = ["", "", "", "", "", ""] #A measurement for each element in the order array

    def _setupPaths(self):
        app = self.app
        
        #path for main menu
        @app.route('/')
        def index():
            #renders the main index menu
            return render_template("index.html")

        @app.route("/mainMenu")
        def mainMenu():
            #Renders the main menu inside of the index
            return render_template("mainMenu.html")

        @app.route('/trackMode')
        def trackMenu():
            #renders track mode
            return render_template("trackMode.html")

        @app.route('/mapMode')
        def mapMenu():
            #renders map mode
            return render_template("mapMode.html")

        @app.route('/mapMenuOptions')
        def mapMenuOptions():
            #adds the options to the menu when in map mode
            return HTMLGenerator.generateMapModeMenuHTML(self.GPSDataOrder)

        @app.route('/mapModeDataDisplay')
        def getMapMode():
            return HTMLGenerator.generateMapModeDataViewHTML(self.GPSDataOrder, self.GPSDataMeasurement)

        #@app.route('/mapModeDataDisplay')
        #def mapModeDataDisplay():
        #    return render_template("mapModeDataDisplay.html")

        @app.route('/mapGPSData')
        def mapGPSData():

            print(self.gpsState.get())
            return MapMode.generateMapModeJSON(self.gpsState.get(), str(self.logger.getCount()))

        @app.route('/trackGPSData')
        def trackGPSData():

            return TrackMode.generateTrackModeJSON(self.gpsState.get(), request.args.get("targetLat"), request.args.get("targetLon"))

        @app.route('/csvWrite', methods = ['POST'])
        def csvWrite():
            currentGPSState = self.gpsState.get()
            
            if currentGPSState is None:
                
                return jsonify({"error": "no GPS data available"}), 503
            
            # Read note from request body
            note = request.form.get('note', '')  # Default to empty string if no note provided
            
            row = [
                
                self.logger.getCount() + 1,
                currentGPSState.latitude,
                currentGPSState.longitude,
                currentGPSState.altitude,
                currentGPSState.fix,
                currentGPSState.satellites,
                currentGPSState.hdop,
                note,
                
            ]

            self.logger.write(row)

            return jsonify({
                
                "success": True,
                "pointNumber": self.logger.getCount(),
                "message": f"Point {self.logger.getCount()} saved successfully."
                
            }), 200
            
            
        @app.route('/savedPoints')
        def savedPoints():
            
            return jsonify({"points": self.logger.listSavedPoints()})
            
        @app.route('/quit', methods=['POST'])
        def quit():
            
            print("Thankyou for using the Farm Dog GNSS RTK system.")
            threading.Timer(0.5, lambda: os._exit(0)).start()
            return jsonify({"success": True}), 200

    def run(self):
        self._setupPaths()
        self.app.run(
            host = self.config.host,
            port = self.config.port,
            debug = False,
            threaded = True,
        )



#A class for controlling the main app
class MainApp:
    
    def __init__(self):
        
        #Setup config classes
        self.config = Config()
        self.webServerConfig = WebServerConfig()

        #Setup GPS state
        self.gpsState = GPSState()

        if self.config.useMockGPS:
            
            print("Using mock GPS data source")
            self.gps = GPSLogicClassTest(self.config, self.gpsState)
            
        else:
            
            print("Using real GPS data source")
            self.gps = GPSLogicClass(self.config, self.gpsState)
        
        self.rtk = RTKLogicClass(self.config, self.gps)
        
        #Setup webserver thread
        self.webServer = FlaskWebServerClass(self.webServerConfig, self.gpsState)


    def run(self):
        
        #Start GPS Logic thread
        print("connecting to GPS")
        
        if not self.gps.connect():
            
            print("could not connect to GPS")
            return

        #start gps thread
        self.gps.threadStart()

        if not self.config.useMockGPS:
            
            self.rtk.threadStart()
            
        else:
            
            print("RTK corrections are disabled in mock GPS mode")

        #Start webserver main task
        print(f"starting web UI on http://{self.webServerConfig.host}:"
              f"{self.webServerConfig.port}"
        )

        self.webServer.run()

    def quit(self):
        
        print("Thankyou for using the Farm Dog GNSS RTK system.")
        time.sleep(5)
        sys.exit()

if __name__ == "__main__":
    #app = MainApp() #Create an instance of the MainApp class
    #app.run() #Call the run function
    MainApp().run()
