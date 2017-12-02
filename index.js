#!/usr/bin/env node
const pkg = require('./package.json');
const config = require('./config.js');
const request = require('request');

const cookieJar = request.jar();

const log = require('yalm');

log.loglevel = ['debug', 'info', 'warn', 'error'].indexOf(config.verbosity) !== -1 ? config.verbosity : 'info';

log.info(pkg.name + ' ' + pkg.version + ' starting');

const Mqtt = require('mqtt');

log.info('mqtt trying to connect', config.url);
const mqtt = Mqtt.connect(config.url, {will: {topic: config.name + '/connected', payload: '0', retain: true}});
mqtt.publish(config.name + '/connected', '1');

let connected;

mqtt.on('connect', () => {
    connected = true;
    log.info('mqtt connected ' + config.url);
});

mqtt.on('close', () => {
    if (connected) {
        connected = false;
        log.info('mqtt closed ' + config.url);
    }
});

mqtt.on('error', () => {
    log.error('mqtt error ' + config.url);
});

let numMeters;
const names = {};

getAuthCookie(getMeters);

function getAuthCookie(callback) {
    log.info('login on ' + config.smartmeter);
    request.get({
        url: 'http://' + config.smartmeter + '/index.php',
        jar: cookieJar
    }, (err, res, body) => {
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
    }, (err, res, body) => {
        const data = JSON.parse(body);
        if (data.authentication == false) {
            log.error('auth failure');
            mqtt.publish(config.name + '/connected', '1', {retain: true});
            setTimeout(() => {
                getAuthCookie(getMeters);
            }, 60000);
            return;
        }

        const meters = data.meters;

        numMeters = meters.length;

        for (let i = 0; i < meters.length; i++) {
            names[i] = meters[i].label;
            // Names[i] = names[i].replace(/Teridian/, 'Gesamtverbrauch');
            log.debug(i, meters[i]);
        }

        loop();
    });
}

let meter_index = 0;

function loop() {
    if (++meter_index >= numMeters) {
        meter_index = 0;
    }
    getValue(meter_index, () => {
        setTimeout(loop, config.interval);
    });
}

function getValue(meter_id, callback) {
    request.post({
        jar: cookieJar,
        url: 'http://' + config.smartmeter + '/mum-webservice/consumption.php?meter_id=' + meter_id
    }, (err, res, body) => {
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
            log.error('auth failure');
            getAuthCookie(getMeters);
            return;
        }

        const idx = ('0' + (meter_id + 1)).slice(-2);

        const topic = config.name + '/status/' + names[meter_id];
        const payload = JSON.stringify({val: parseFloat((data[idx + '_power'] * 1000).toFixed(1))});

        log.debug(topic, payload);
        mqtt.publish(topic, payload, {retain: true});
        callback();
    });
}

process.on('SIGINT', () => {
    log.info('got SIGINT. exiting.');
    process.exit(0);
});
process.on('SIGTERM', () => {
    log.info('got SIGTERM. exiting.');
    process.exit(0);
});
