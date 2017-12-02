# bcontrol2mqtt

[![NPM version](https://badge.fury.io/js/bcontrol2mqtt.svg)](http://badge.fury.io/js/bcontrol2mqtt)
[![Dependency Status](https://img.shields.io/gemnasium/hobbyquaker/bcontrol2mqtt.svg?maxAge=2592000)](https://gemnasium.com/github.com/hobbyquaker/bcontrol2mqtt)
[![Build Status](https://travis-ci.org/hobbyquaker/bcontrol2mqtt.svg?branch=master)](https://travis-ci.org/hobbyquaker/bcontrol2mqtt)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![License][mit-badge]][mit-url]

> Publish Measurements from B-Control Energy Manager Smart Meters on MQTT 🔌 📈

Connects [TQ Energy Manager](http://www.tq-group.com/produkte/produktdetail/prod/energy-manager/extb/Main/) to MQTT.
Compatible devices are also available from [Busch-Jäger](https://www.busch-jaeger.de/produkte/produktloesungen/busch-smartenergy/busch-energymonitor/) 
and [B-Control](http://www.posid.de/energy-shop/?tx_trattmannshop_shop%5Bcategory%5D=5&tx_trattmannshop_shop%5Baction%5D=list&tx_trattmannshop_shop%5Bcontroller%5D=Article&cHash=095630d91afa7daafa1e7e1174562838#shop-articles)


## Installation

Prerequisites: [Node.js](https://nodejs.org) 6.0 or higher.

`$ sudo npm install -g bcontrol2mqtt`

I suggest to use [pm2](http://pm2.keymetrics.io/) to manage the bcontrol2mqtt process (start on system boot, manage log files, 
...)


## Usage

`$ bcontrol2mqtt --help`


## License

MIT (c) 2015-2017 [Sebastian Raff](https://github.com/hobbyquaker)

[mit-badge]: https://img.shields.io/badge/License-MIT-blue.svg?style=flat
[mit-url]: LICENSE
