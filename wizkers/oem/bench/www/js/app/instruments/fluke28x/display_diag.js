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
 * Fluke 289 Diagnostics View. Extensive meter control.
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

define(function(require) {
    "use strict";

    var $       = require('jquery'),
        _       = require('underscore'),
        Backbone = require('backbone'),
        template = require('js/tpl/instruments/Fluke289/Fluke289DiagView.js');

    return Backbone.View.extend({

        initialize:function (options) {

            if (linkManager.isStreaming()) {
                linkManager.stopLiveStream();
            }

            linkManager.on('input', this.showInput, this);

            this.initialized = false;
        },

        events: {
            "click .refresh": "refresh",
            "click .setrtc": "setrtc",
            "click #cmdsend": "sendcmd",
            "keypress input#manualcmd": "sendcmd",
            "click .keyboard": "presskey",
            "click .takeshot": "screenshot",
            "click .setassetinfo": "setassetinfo",
            "click .toggleled": "toggleled",
            "click .switchoff": "switchoff",
        },

        onClose: function() {
            console.log("Fluke289 diag view closing...");
            linkManager.off('input', this.showInput, this);
        },

        render:function () {
            this.$el.html(template(this.model.toJSON()));

            this.refresh();
            return this;
        },

        refresh: function() {
            // Query DMM for various info:
            this.queriesDone = false;
            if (linkManager.isConnected()) {
                linkManager.driver.getDevInfo();
                linkManager.driver.version();
                linkManager.driver.takeScreenshot();
            }
        },

        presskey: function(event) {
            var val = event.currentTarget.value;
            linkManager.driver.sendKeypress(val);
            setTimeout(linkManager.driver.takeScreenshot,150);
        },

        toggleled: function() {
            if (linkManager.driver.toggleLed()) {
                $('.toggleled', this.el).addClass('btn-success');
            } else {
                $('.toggleled', this.el).removeClass('btn-success');
            }
        },

        switchoff: function() {
            linkManager.driver.off();
        },


        setrtc: function() {
            linkManager.driver.settime();
        },

        sendcmd: function(event) {
            // We react both to button press & Enter key press
            if ((event.target.id == "manualcmd" && event.keyCode==13) || (event.target.id != "manualcmd"))
                linkManager.sendCommand($('#manualcmd',this.el).val());
        },

        screenshot: function() {
            linkManager.driver.takeScreenshot();
        },

        setassetinfo: function() {
            linkManager.driver.setDevInfo(
                $('#operator').val(),
                $('#company').val(),
                $('#site').val(),
                $('#contact').val()
            );
        },

        showInput: function(data) {
            // Blink the indicator to show we're getting data
            //$('.comlink', this.el).toggleClass('btn-success');
            var i = $('#input',this.el);
            i.val(i.val() + JSON.stringify(data) + '\n');
            // Autoscroll:
            i.scrollTop(i[0].scrollHeight - i.height());

            if (!data.error) {
                $('.commandstatus', this.el).html("<i class=\"icon-ok icon-white\"></i>&nbsp;Command OK")
                    .removeClass('btn-danger').addClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
            } else {
                $('.commandstatus', this.el).html("<i class=\"icon-warning-sign icon-white\"></i>&nbsp;COMMAND ERROR")
                    .addClass('btn-danger').removeClass('btn-success').removeClass('btn-warning').removeAttr('disabled');
            }

            if (data.screenshot != undefined) {
                // Incoming data from a screenshot
                var height = data.height;
                var width = data.width;
                var cnv = $('#screenshot')[0];
                var ctx = cnv.getContext('2d');
                ctx.canvas.width = width;
                ctx.canvas.height = height;
                var imageData = ctx.createImageData(width,height);

                // Now fill the canvas using our B&W image:
                // Our data is a 320x40 array of 32bit integers that store 32 pixels
                // each. (32*40 = 240)
                for (var y = 0; y < height; y++) {
                    for (var x = 0; x < width; x++) {
                        // Find pixel index in imageData:
                        var idx = (y * width + x) * 4;;
                        if (data.screenshot[y][Math.floor(x/32)] & (1 << ((31-x)%32))) {
                            imageData.data[idx] = 255;
                            imageData.data[idx+1] = 255;
                            imageData.data[idx+2] = 255;
                        } // No need for ==0 because imageData.data is initialized at 0
                       imageData.data[idx+3] = 255;
                    }
                }
                ctx.putImageData(imageData,0,0);

            } else {

                // Populate various fields based on what properties we receive
                for (var prop in data) {
                    if ($('#'+prop, this.el)) {
                        $('#'+prop,this.el).val(data[prop]);
                        $('#'+prop,this.el).html(data[prop]);
                    }
                }
            }

        }
    });
});