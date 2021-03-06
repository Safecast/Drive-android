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

/*
 * @author Edouard Lafargue, ed@lafargue.name
 * All rights reserved.
 */
define(function (require) {
    "use strict";

    var $ = require('jquery'),
        _ = require('underscore'),
        Backbone = require('backbone'),
        template = require('tpl/connections/serialport');

    return Backbone.View.extend({

        initialize: function (options) {
            console.log(options);
            this.ports = options.ports;
            this.btlist = {};
            if (this.model.get('tcpip') == undefined) {
                this.model.set('tcpip', {
                    host: '127.0.0.1',
                    port: 7373,
                    proto: 'tcp'
                });
            }
            if (this.model.get('btspp') == undefined) {
                this.model.set('btspp', {
                    mac: '00:00:00:00:00:00',
                    proto: 'btspp'
                });
            }

            this.refresh();
        },

        events: {
            "click #refresh": "refresh",
            "change #port": "toggleTcp"
        },

        onClose: function () {
            console.log("Serial connection settings closing");
        },

        render: function () {
            this.$el.html(template(_.extend(this.model.toJSON(), {
                ports: this.ports,
                btlist: this.btlist
            })));
            if (this.model.get('port') != 'TCP/IP')
                $('.hide-tcp', this.el).hide();
            if (this.model.get('port') != 'Bluetooth')
                $('.hide-spp', this.el).hide();
            else
                this.getBluetoothDevices();
            return this;
        },

        toggleTcp: function (e) {
            if (e.target.value == 'TCP/IP')
                $('.hide-tcp', this.el).show();
            else
                $('.hide-tcp', this.el).hide();
            if (e.target.value == 'Bluetooth') {
                this.getBluetoothDevices();
                this.render();
            } else
                $('.hide-spp', this.el).hide();
        },

        refreshDevices: function (devices) {
            this.ports = devices;
            this.render();
        },

        getBluetoothDevices: function() {
            // Can only be called on Cordova !
            var self = this;
            if (Object.keys(this.btlist).length == 0) {
                // We only do this once, otherwise we end up in an
                // infinite render tool :)
                bluetoothSerial.list(
                    function(list){
                        for (var d in list) {
                            self.btlist[list[d].address] = list[d];
                        }
                        self.$('.hide-spp').show();
                        self.render();
                    },
                    function(e){
                        console.error(e);
                    }
                );
            }
        },

        refresh: function () {
            // Catch a "Refresh" value here which indicates we should
            // just ask for a list of ports again:
            var insType = this.model.get('type');
            linkManager.once('ports', this.refreshDevices, this);
            linkManager.getPorts(insType);
        }

    });
});