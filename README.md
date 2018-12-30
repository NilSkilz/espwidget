Work in progress ESP8266 and ST7789 (240x240 IPS LCD) mini info display framework.

<img src="https://pbs.twimg.com/media/DsbQYDfUcAAAItL.jpg:small"/>

The idea is to make cheap wifi-connected info displays to put on your desk or around the house as always-on dashboards. The ST7789-based LCD is crisp and bright and [can be found for less than $4 online](https://www.aliexpress.com/wholesale?catId=0&SearchText=st7789), and the ESP8266 module I'm using (a Wemos D1 Mini) [can be found for just over $2](https://www.aliexpress.com/wholesale?catId=0&SearchText=wemos%20d1%20mini).

<img src="https://pbs.twimg.com/media/DskVuSEUwAAtUuY.jpg:small"/>

Since the ESP8266 doesn't have enough RAM for a full framebuffer (240 * 240 * 2 bytes per pixel) and the Arduino graphics libraries are lacking important features like anti-aliasing, the rendering is done server-side using [node-canvas](https://github.com/Automattic/node-canvas) and streamed over HTTP as a raw RGB565 bitmap directly to the LCD driver.

Right now there's a single widget implementation which displays the median Air Quality Index for a geographical area using data from purpleair.com (shown above). It should be easy to add new widgets since all of the data loading, processing, and rendering is done in Javascript with the powerful [canvas api](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D).

In theory the server could be run as a Google Cloud Function (and in fact it was originally designed that way), but it seems Google Cloud Functions [are not reliable](https://issuetracker.google.com/issues/117889747) as of this writing (2018-11-20) and the deployment process was opaque and unreliable as well which didn't inspire confidence. I haven't tried AWS Lambda, but it's worth considering as an alternative.

However, one thing to keep in mind with cloud hosting is that network transfers may exceed free tier limits due to the size of the raw bitmaps being transferred. Assuming 5 widgets refreshing once every 5 minutes (or equivalently, a single widget refreshing every minute), there's 240 * 240 * 2 = 112.5 KB per minute, which means 158.2 MB per day, or 4.8 GB in a 31-day month, and that's not including any HTTP overhead. That said, it's likely only a few dollars of data transfer per year, and could be reduced further by making the client sleep or at least reduce its update frequency during the night.


## Server setup
```
# Install nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
```
(restart shell)
```
# Install node 8
nvm install 8

# Clone repo
git clone https://github.com/scottbez1/espwidget.git

cd espwidget/server

# For Raspberry Pi only (uncomment next command): install build dependencies for node-canvas (prebuilt library isn't available for arm)
#sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Install node module
npm install

# Enter configuration
cp config.js.example config.js
vim config.js

# Run
node index.js
```

## PIN Layout
GND -> GND
VCC -> 5v or 3.3v
SCL -> D5
SDA -> D7
RES -> D4
DC -> D3
BLK -> not connected

## TFT_eSPI library setup
There are a few configurable options as part of the TFT_eSPI Library.
First you'll need to make sure the library is downloaded via the Arduino IDE. Go to Sketch -> Include Library -> Manage Libraries and search for the TFT_eSPI library.

Once this is installed you'll need the User_Setup.h file on your system. On a Mac its Documents/Arduino/libraries/TFT_eSPI/User_Setup.h

Copy the example file in the client directory and overwrite the existing file.

## Client setup
- Copy config.h.example to config.h
- Edit config.h to contain your Wifi credentials and the hostname of the server
- Install!

## Home Assistant / Node-Red Setup
You'll be creating a really simple API in Node-Red. Copy the following code into a node-red flow.

```
[{"id":"2ba4e9bf.89785e","type":"http response","z":"a0e121ce.05c078","name":"","statusCode":"200","headers":{},"x":720,"y":400,"wires":[]},{"id":"b850811c.b08728","type":"api-current-state","z":"a0e121ce.05c078","name":"Get Value","server":"b33b6b5c.d07378","halt_if":"","halt_if_type":"","halt_if_compare":"is","override_topic":true,"override_payload":true,"override_data":true,"entity_id":"","state_type":"str","outputs":1,"x":560,"y":400,"wires":[["2ba4e9bf.89785e"]]},{"id":"3b8513fe.fffb9c","type":"function","z":"a0e121ce.05c078","name":"Get entity_id","func":"msg.payload = {\n    entity_id: msg.req.params.entity_id\n}\nreturn msg;","outputs":1,"noerr":0,"x":410,"y":400,"wires":[["b850811c.b08728"]]},{"id":"81d6cdf2.c4d7b","type":"http in","z":"a0e121ce.05c078","name":"","url":"/homeassistant/:entity_id","method":"get","upload":false,"swaggerDoc":"","x":180,"y":400,"wires":[["3b8513fe.fffb9c"]]},{"id":"b33b6b5c.d07378","type":"server","z":"","name":"Home Assistant","legacy":false,"hassio":true,"rejectUnauthorizedCerts":true,"ha_boolean":"y|yes|true|on|home|open"}]
```

The URL for the node service will now take 3 parameters in the query string, so should look like the following:
`http://[ip-address]:3000/homeassistant?entity_id=[ENTITY_ID]&target=[20]&rgb565=1`

- The target is optional and can be used to adjust the "Good" target for temperature devices.
- The rgb565 parameter tells the service whether to render it for the device. Remove this to render in a browser.
