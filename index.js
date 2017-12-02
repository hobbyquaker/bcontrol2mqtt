#!/usr/bin/env node

const Mqtt = require('mqtt');
const request = require('request');
const log = require('yalm');
const pkg = require('./package.json');
const config = require('./config.js');

const cookieJar = request.jar();

log.setLevel(['debug', 'info', 'warn', 'error'].indexOf(config.verbosity) === -1 ? 'info' : config.verbosity);

log.info(pkg.name + ' ' + pkg.version + ' starting');

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
    log.info('trying to get auth cookie from ' + config.smartmeter);
    request.get({
        url: 'http://' + config.smartmeter + '/index.php',
        jar: cookieJar
    }, err => {
        if (err) {
            log.error('auth failed');
            process.exit(1);
        } else {
            log.info('auth successful');
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
        if (err) {
            log.error('getMeters failed');
            process.exit(1);
        }
        const data = JSON.parse(body);
        if (!data.authentication) {
            log.error('auth failure');
            mqtt.publish(config.name + '/connected', '1', {retain: true});
            setTimeout(() => {
                getAuthCookie(getMeters);
            }, 60000);
            return;
        }

        const meters = data.meters;

        numMeters = meters.length;
        log.info('got', numMeters, 'meters');

        for (let i = 0; i < meters.length; i++) {
            names[i] = meters[i].label;
            // Names[i] = names[i].replace(/Teridian/, 'Gesamtverbrauch');
            log.debug(i, meters[i]);
        }
        log.info('entering loop');
        loop();
    });
}

let meterIndex = 0;

function loop() {
    if (++meterIndex >= numMeters) {
        meterIndex = 0;
    }
    getValue(meterIndex, () => {
        setTimeout(loop, config.interval);
    });
}

function getValue(meterId, callback) {
    log.debug('request meterId', meterId);
    request.post({
        jar: cookieJar,
        url: 'http://' + config.smartmeter + '/mum-webservice/consumption.php?meter_id=' + meterId
    }, (err, res, body) => {
        if (err) {
            log.error(err);
            process.exit(1);
        }
        let data;
        try {
            data = JSON.parse(body);
        } catch (err) {
            log.error(err.message);
            return;
        }
        if (!data.authentication) {
            mqtt.publish(config.name + '/connected', '1', {retain: true});
            log.error('auth failure');
            getAuthCookie(getMeters);
            return;
        }

        const idx = ('0' + (meterId + 1)).slice(-2);

        const topic = config.name + '/status/' + names[meterId];
        const payload = JSON.stringify({val: parseFloat((data[idx + '_power'] * 1000).toFixed(1))});

        log.debug('mqtt publish', topic, payload);
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
