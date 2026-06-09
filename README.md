# FarmDog-App

FarmDog-App is an open-source Flask-based RTK GNSS surveying application designed to run on a Raspberry Pi connected to a u-blox ZED-F9P receiver.

## Features

- Live GNSS position display
- RTK Fixed support
- CSV coordinate logging
- Find Mode navigation
- Web-based interface
- NTRIP correction support

## Requirements

- Raspberry Pi OS
- Python 3.10+
- u-blox ZED-F9P receiver
- RTK correction source

## Installation

##### 1. Install the FarmDog-App
```
git clone https://github.com/Farm-Dog-ICT302/FarmDog-App.git
```

##### 2. Navigate into the application directory
```
cd FarmDog-App
```

##### 3. Run the installation script (installs Flask and other dependencies)
```
chmod +x install.sh
./install.sh
```

##### 4. Start the Flask Web GUI and Python backend
```
./startserver.sh
```

##### 5. Navigate to Web Browser on any device on the same network
```
http://[IP ADDRESS]:5000
```


## Accessing the Interface
```
http://[IP ADDRESS]:5000
```

## Related Project

For hardware documentation and project information:

https://github.com/Farm-Dog-ICT302/Farm-Dog-RTK-GNSS-System
