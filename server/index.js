const express = require('express');

const { widgetify } = require('./widget');
const { drawAqiWidget } = require('./aqi');
const { drawWeatherWidget } = require('./weather');
const { drawHomeAssistantWidget } = require('./homeassistant');

const app = express()
const port = 3000
app.get('/', (req, res) => res.send('Hello World!'));
app.get('/renderwidget', widgetify(drawAqiWidget));
app.get('/weather', widgetify(drawWeatherWidget));
app.get('/homeassistant', widgetify(drawHomeAssistantWidget));

app.listen(port, '0.0.0.0', () => console.log(`Example app listening on port ${port}!`))
