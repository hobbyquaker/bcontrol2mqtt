#!/usr/bin/env node
var pkg =   require('./package.json');
var config = require('yargs')
    .usage(pkg.name + ' ' + pkg.version + '\n' + pkg.description + '\n\nUsage: $0 [options]')
    .describe('v', 'possible values: "error", "warn", "info", "debug"')
    .describe('n', 'instance name. used as mqtt client id and as prefix for connected topic')
    .describe('u', 'mqtt broker url. See https://github.com/mqttjs/MQTT.js#connect-using-a-url')
    .describe('s', 'smartmeter IP address.')
    .describe('i', 'polling interval')
    .describe('h', 'show help')
    .alias({
        'h': 'help',
        'n': 'name',
        'u': 'url',
        'v': 'verbosity',
        's': 'smartmeter',
        'i': 'interval'

    })
    .default({
        'u': 'mqtt://127.0.0.1',
        's': '172.16.23.138',
        'i': 1000,
        'n': 'bcontrol',
        'v': 'info'
    })
    .config('config')
    .version(pkg.name + ' ' + pkg.version + '\n', 'version')
    .help('help')
    .argv;

var request =   require('request');
var cookieJar = request.jar();

var log =               require('yalm');
log.loglevel =          ['debug', 'info', 'warn', 'error'].indexOf(config.verbosity) !== -1 ? config.verbosity : 'info';

log.info(pkg.name + ' ' + pkg.version + ' starting');

var Mqtt = require('mqtt');

log.info('mqtt trying to connect', config.url);
var mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0', retain: true}});
mqtt.publish(config.name + '/connected', '1');

var connected;

mqtt.on('connect', function () {
    connected = true;
    log.info('mqtt connected ' + config.url);
});

mqtt.on('close', function () {
    if (connected) {
        connected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', function () {
    log.error('mqtt error ' + config.url);
});


var numMeters;
var names = {};

getAuthCookie(getMeters);

function getAuthCookie(callback) {
    log.info("login on " + config.smartmeter);
    request.get({
        url: 'http://' + config.smartmeter + '/index.php',
        jar: cookieJar
    }, function (err, res, body) {
        if (err) {
            log.error('auth failed');
            stop();
        } else {
            mqtt.publish(config.name + '/connected', '2', {retain: true});
            callback();
        }
    });
}

function getMeters() {

    request.get({
        url: 'http://' + config.smartmeter + '/mum-webservice/meters.php',
        jar: cookieJar
    }, function (err, res, body) {
        var data = JSON.parse(body);
        if (data.authentication == false) {
            log.error("auth failure");
            mqtt.publish(config.name + '/connected', '1', {retain: true});
            setTimeout(function () {
                getAuthCookie(getMeters);
            }, 60000);
            return;
        }

        var meters = data.meters;

        numMeters = meters.length;

        for (var i = 0; i < meters.length; i++) {
            names[i] = meters[i].label;
            //names[i] = names[i].replace(/Teridian/, 'Gesamtverbrauch');
            log.debug(i, meters[i]);
        }

        loop();

    });
}


var meter_index = 0;


function loop() {
    if (++meter_index >= numMeters) meter_index = 0;
    getValue(meter_index, function () {
        setTimeout(loop, config.interval);
    });
}

function getValue(meter_id, callback) {
    request.post({
        jar: cookieJar,
        url: 'http://' + config.smartmeter + '/mum-webservice/consumption.php?meter_id=' + meter_id
    }, function (err, res, body) {
        if (err) {
            log.error(err);
            return;
        }
        try {
            var data = JSON.parse(body);
        } catch (e) {
            log.error(e.message);
            return;
        }
        if (data.authentication == false) {
            mqtt.publish(config.name + '/connected', '1', {retain: true});
            log.error("auth failure");
            getAuthCookie(getMeters);
            return;
        }

        var idx = ('0' + (meter_id + 1)).slice(-2);

        var topic = config.name + '/status/' + names[meter_id];
        var payload = JSON.stringify({val: parseFloat((data[idx + "_power"] * 1000).toFixed(1))});

        log.debug(topic, payload);
        mqtt.publish(topic, payload, {retain: true});
        callback();
    });
}


process.on('SIGINT', function () {
    log.info('got SIGINT. exiting.');
    process.exit(0);
});
process.on('SIGTERM', function () {
    log.info('got SIGTERM. exiting.');
    process.exit(0);
});
