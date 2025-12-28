# React Webapp for Tumbller Robots

## Project Requirements

- A react web app to control robots that expose movements and camera stream via endpoints. 
- A robot exposes movements via /motor/forward, /motor/back, /motor/left, /motor/right and a camera stream endpoint. 
- The robot runs on ESP32S3 and ESP-CAM. Both have different IPs. 
- The react web app should be able to control multiple robots.
- When someone wants to control the robot via webapp the app ask for the IP of the robot and ESP-CAM on the robot. 
- After entering the IP the webapp provides four controls for forward/back/left/right movement and provides the camera stream above the controls. 
- If the camera stream is not working then a default message of no camera is shown. 

## Tumbller Robot Repositories

- https://github.com/YakRoboticsGarage/tumbller-esp32s3
- https://github.com/YakRoboticsGarage/tumbller-esp-cam
