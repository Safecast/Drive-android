/**
 * This file is part of Wizkers.io
 *
 * The MIT License (MIT)
 *  Copyright (c) 2016 Edouard Lafargue, ed@wizkers.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software
 * is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
 * IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 *
 * The Instrument manager handles all interactions with the various instruments.
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

define(function (require) {

    "use strict";

    var _ = require('underscore'),
        Backbone = require('backbone'),
        Instrument = require(['app/models/instrument']);

    var InstrumentManager = function () {

        // current_instrument is a Backbone Model instance
        var current_instrument = null; // The instrument currently in use

        // Instruments supported in all runmodes:
        this.supportedInstruments = {
            "elecraft": {
                name: "Elecraft KX3",
                type: 'app/instruments/elecraft/elecraft',
                settings: 'app/instruments/elecraft/settings',
                connectionsettings: 'app/views/instrument/serialport'
            },
            "elecraft_kx2": {
                name: "Elecraft KX2",
                type: 'app/instruments/elecraft_kx2/elecraft_kx2',
                settings: 'app/instruments/elecraft/settings',
                connectionsettings: 'app/views/instrument/serialport'
            },
//            "elecraft_k3": {
//                name: "Elecraft K3",
//                type: 'app/instruments/elecraft_k3/elecraft_k3',
//                settings: 'app/instruments/elecraft/settings',
//                connectionsettings: 'app/views/instrument/serialport'
//            },
            "elecraft_kxpa100": {
                name: "Elecraft KXPA100 Standalone",
                type: 'app/instruments/elecraft_kxpa100/elecraft_kxpa100',
                settings: null,
                connectionsettings: 'app/views/instrument/serialport'
            },
            "elecraft_xg3": {
                name: "Elecraft XG3",
                type: 'app/instruments/elecraft_xg3/elecraft_xg3',
                settings: null,
                connectionsettings: 'app/views/instrument/serialport'
            },
            "elecraft_siggen": {
                name: "KX3 SWR Sweeper",
                type: 'app/instruments/elecraft_siggen/elecraft_siggen',
                settings: null,
                connectionsettings: 'app/views/instrument/serialport'
            },
            "yaesu_817nd": {
                name: "Yaesu 817ND",
                type: 'app/instruments/yaesu_817nd/yaesu_817nd',
                settings: 'app/instruments/yaesu_817nd/settings',
                connectionsettings: 'app/views/instrument/serialport'
            },
            "yaesu_ft857": {
                name: "Yaesu FT-857",
                type: 'app/instruments/yaesu_ft857/yaesu_ft857',
                settings: 'app/instruments/yaesu_817nd/settings',
                connectionsettings: 'app/views/instrument/serialport'
            },
            "slevel_monitor": {
                name: "S-Level monitor",
                type: 'app/instruments/slevel_monitor/slevel_monitor',
                settings: 'app/instruments/slevel_monitor/settings',
                connectionsettings: 'app/views/instrument/serialport'
            },
            "simple_serial": {
                name: "Simple serial terminal",
                type: 'app/instruments/simple_serial/simple_serial',
                settings: 'app/instruments/simple_serial/settings',
                connectionsettings: 'app/views/instrument/serialport'
            }
        };

        // The instruments below are only supported in Chrome runmode:
        if (vizapp.type == 'chrome') {
            this.supportedInstruments['sark110'] = {
                name: 'Sark110 Antenna Analyzer',
                type: 'app/instruments/sark110/sark110',
                settings: 'app/instruments/sark110/settings',
                connectionsettings: 'app/views/instrument/usbhid'
            };
            this.supportedInstruments['elecraft_remote'] = {
                name: 'Remote Elecraft KX3',
                type: 'app/instruments/elecraft_remote/elecraft_remote',
                settings: 'app/instruments/elecraft_remote/settings',
                connectionsettings: 'app/views/instrument/webrtc'
            };
        }

        /**
         * Get a view that renders the instrument-specific port settings.
         * @param {String}   instrument The instrument type (see supportedInstruments above)
         * @param {Object}   arg        Argument for the view
         * @param {Function} callback   Callback
         */
        this.getConnectionSettingsFor = function (instrument, arg, callback) {
            require([this.supportedInstruments[instrument].connectionsettings], function (view) {
                callback(new view(arg));
            });
        }

        /**
         * The optional extra settings in the "Instrument Details" view. These are settings
         * that are required to connect to the instrument.
         * @param {String}   instrument The instrument type
         * @param {Object}   arg        Argument to be passed at view creation
         * @param {Function} callback   Callback once the view is created
         */
        this.getInstrumentSettings = function (instrument, arg, callback) {
            if (this.supportedInstruments[instrument].settings != null)
                require([this.supportedInstruments[instrument].settings], function (view) {
                    callback(new view(arg));
                });
        }

        /**
         * Get the type of connection for a given instrument type. This is used by chromeSocket
         * to understand what connection type to query for a port list.
         * @param   {String} instrument Instrument type (see supportedInstruments above)
         * @returns {String} Connection settings.
         */
        this.getConnectionTypeFor = function (instrument) {
            if (this.supportedInstruments[instrument] == undefined)
                return '';
            return this.supportedInstruments[instrument].connectionsettings;
        }

        this.clear = function () {
            current_instrument = null;
        }

        this.setInstrument = function (instrument, cb) {
            var self = this;
            var type = instrument.get('type');
            console.warn('Switching to instrument', type);
            for (var ins in this.supportedInstruments) {
                if (ins == type) {
                    current_instrument = instrument;
                    // Dynamically load the instrument:
                    require([this.supportedInstruments[ins].type], function (instrumentObject) {
                        // Nifty: we extend our instrument manager with the methods of our instrument.
                        // (since all instruments support the same API, a change of instrument
                        // overrides the methods)
                        _.extend(self, new instrumentObject());
                        self.getDriver(function(driver) {
                            linkManager.setDriver(driver);
                            console.warn('Trigger instrumentChanged');
                            self.trigger('instrumentChanged'); // Tell views who rely on the instrument manager...
                            cb();
                        });
                    });
                }
            }
        }

        this.startUploader = function () {
            linkManager.setUploader(this.getUploader());
        }

        this.stopUploader = function () {
            linkManager.setDriver(this.getDriver());
        };

        // Get the currently loaded instrument
        this.getInstrument = function () {
            return current_instrument;
        }

    };

    _.extend(InstrumentManager.prototype, Backbone.Events);

    return InstrumentManager;

});