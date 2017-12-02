module.exports = require('yargs')
    .usage('Usage: $0 [options]')
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
    .version()
    .help('help')
    .argv;
