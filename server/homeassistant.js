const { roundRect, wrapText } = require('./canvas_util');
const { registerFont } = require('canvas');
const { get_json } = require('./api_util')

try {
    var { config } = require('./config.js');
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
    } else {
        throw "No configuration found! Copy config.js.example to config.js, update the values inside, and try again"
    }
}
registerFont('fonts/Roboto-Light.ttf', { family: 'Roboto Light' });
registerFont('fonts/Roboto-Thin.ttf', { family: 'Roboto Thin' });
registerFont('fonts/Roboto-MediumItalic.ttf', { family: 'Roboto Medium Italic' });

const tempLookup = [
    {
        "min": 0,
        "max": 17.9,
        "index": {
            "min": 0,
            "max": 50
        },
        "label": "Very Low",
        "gradient": ["#43e97b", "#38f9d7"],
        "color": "#393057"
    },
    {
        "min": 18,
        "max": 19.9,
        "index": {
            "min": 51,
            "max": 100
        },
        "label": "Low",
        "gradient": ["#96fbc4", "#f9f586"],
        "color": "#393057"
    },
    {
        "min": 20,
        "max": 21.9,
        "index": {
            "min": 101,
            "max": 150
        },
        "label": "Good",
        "gradient": ["#f794a4", "#fdd6bd"],
        "color": "#393057"
    },
    {
        "min": 22,
        "max": 23.9,
        "index": {
            "min": 151,
            "max": 200
        },
        "label": "High",
        "gradient": ["#f77062", "#fe5196"],
        "color": "white"
    },
    {
        "min": 24,
        "max": 150,
        "index": {
            "min": 151,
            "max": 200
        },
        "label": "Very High",
        "gradient": ["#f77062", "#fe5196"],
        "color": "white"
    }
];

/**
 * Get Temperature from Home Assistant
 * @param {*} d Data object returned by purpleair's data.json endpoint.
 */
const getTemperature = function(d, target) {

  // Get Adjusted temp
  var adjustment = target - 21 // Generic target is 21°
  d = d - adjustment;

  var t;
    tempLookup.forEach(function(temp) {
      if (temp.min <= d && temp.max >= d) {
        console.log('Found it: ', temp);
        t = temp;
      }
    })
    return t;
}

exports.drawHomeAssistantWidget = async function(ctx, req, res) {

  if (req.query['entity_id']) {
    try {
      const entity_id = req.query['entity_id'];
      console.log("Requesting Entity: ", entity_id);
      const url = config.host + ':' + config.port + '/homeassistant/' + entity_id;
      console.log('URL: ', url);

      const response = await get_json(url);

      // Assume it's temperature for now

      var target = 21;
      if (req.query['target']) {
        target = req.query['target'];
      }

      console.log('Target = ', target);

      const temp = getTemperature(response, target);
      console.log('Returned Temp: ', temp);
      temp.value = response;
      console.log("Got temp", temp);


      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, 240, 240);

      ctx.beginPath();
      const grd=ctx.createLinearGradient(0,0,0,200);
      grd.addColorStop(0,temp.gradient[0]);
      grd.addColorStop(1,temp.gradient[1]);
      ctx.fillStyle=grd;
      roundRect(ctx, 10, 10, 220, 200, 8);
      ctx.fill();

      ctx.textAlign="center";
      ctx.fillStyle = temp.color;

      ctx.font = '32px Roboto Light';
      ctx.fillText('Temperature', 120, 50);

      ctx.font = '74px Roboto Light';
      ctx.fillText(temp.value, 120, 140);

      ctx.font = '24px Roboto Light';
      wrapText(ctx, temp.label, 120, 180, 200, 24);

      ctx.textAlign="left";
      ctx.font = '14px Roboto Medium Italic';
      ctx.fillStyle = "#888";
      ctx.fillText(new Date().toLocaleString(), 10, 230);
    } catch (e) {
        console.error(e);
        res.status(500).send("uh oh");
    }

  } else {
    throw "No entity_id"
  }
}
