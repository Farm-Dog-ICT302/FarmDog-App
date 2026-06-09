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

git clone https://github.com/Farm-Dog-ICT302/FarmDog-App.git

cd FarmDog-App

chmod +x install.sh
./install.sh

./startserver.sh

## Accessing the Interface

Open:

http://[IP ADDRESS]:5000

## Related Project

For hardware documentation and project information:

https://github.com/Farm-Dog-ICT302/Farm-Dog-RTK-GNSS-System
