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
 * A SafeCast API output plugin
 *
 * @author Edouard Lafargue, ed@lafargue.name
 */

var querystring = require('querystring'),
    utils = require('../utils.js'),
    http = require('http'),
    debug = require('debug')('wizkers:output:safecast');

module.exports = function safecast() {

    var mappings = null;
    var settings = null;
    var output_ref = null;
    var post_options = {};

    // Load the settings for this plugin
    this.setup = function (output) {

        debug('Setup a new instance');
        mappings = output.mappings;
        settings = output.metadata;
        output_ref = output;

        var instance = settings.instance; // can be "production" or "dev"

        // Prepare the post options:
        post_options = {
            host: (instance == "production") ? "api.safecast.org" : "dev.safecast.org",
            port: 80,
            method: 'POST',
            path: '/measurements.json',
            headers: {
                'X-Datalogger': 'wizkers.io server-mode Safecast plugin',
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };
        debug(post_options);
    };

    this.resolveMapping = function (key, data) {
        var m = mappings[key];
        if (typeof m == 'undefined')
            return undefined;
        // Static mappings start with "__"
        if (m.indexOf("__") == 0)
            return m.substr(2);
        return utils.JSONflatten(data)[mappings[key]];
    };

    /**
     * Ask the plugin to send data to the backend.
     * @param {Object}   data The data to send
     * @param {Number}   idx   The output index (required for the callback)
     * @param {Function} cb   Callback that is triggered after success or failure.
     */
    this.sendData = function (data, idx, cb) {
        debug('Sending data to Safecast');

        // Step one: prepare the structure
        var unit = this.resolveMapping("unit", data);
        var radiation = this.resolveMapping("radiation", data);
        var lat = this.resolveMapping("latitude", data);
        var lon = this.resolveMapping("longitude", data);
        var devid = this.resolveMapping("device_id", data);

        // If any of those are empty, abort:
        if (unit == undefined || radiation == undefined || lat == undefined || lon == undefined) {
            debug('Data error, some required fields are empty');
            debug(data);
            output_ref.lastmessage = 'Missing required fields in the data';
            dbs.outputs.get(output_ref._id, function (err, result) {
                if (err) {
                    debug('Safecast output error at missing required fields warning' + err);
                    debug('Our output reference was', output_ref);
                    return;
                }
                output_ref._rev = result._rev;
                output_ref.last = new Date().getTime();
                dbs.outputs.put(output_ref, function (err, result) {});
            });
            // Tell our caller that we couldn't send the data
            cb(false, idx);
            return;
        }

        // Only keep three decimals on Radiation, more does not make sense
        radiation = parseFloat(radiation).toFixed(3);

        var post_obj = {
            'api_key': settings.apikey,
            'measurement[captured_at]': new Date().toISOString(),
            'measurement[unit]': unit,
            'measurement[value]': radiation,
            'measurement[latitude]': lat,
            'measurement[longitude]': lon,
        };

        // Add optional fields if they are there:
        if (devid != undefined)
            post_obj['measurement[device_id]'] = devid;

        var post_data = querystring.stringify(post_obj);

        post_options.headers['Content-Length'] = post_data.length;

        var post_request = http.request(post_options, function (res) {
            res.setEncoding('utf8');
            if (res.statusCode == 201 || res.statusCode == 200) {
                output_ref.lastsuccess = new Date().getTime();
            }
            res.on('data', function (data) {
                debug("API Request result");
                debug(data);
                output_ref.lastmessage = data;
                dbs.outputs.get(output_ref._id, function (err, result) {
                    if (err) {
                        debug('Safecast output API request result storage error', err);
                        debug('Our output reference was', output_ref);
                        cb(false, idx);
                        return;
                    }
                    output_ref._rev = result._rev;
                    dbs.outputs.put(output_ref, function (err, result) {});
                    // Tell our backend we were able to send the data.
                    // Note that this does not reflect whether the backend was
                    // happy about it or not, just that we managed to send the data.
                    cb(true, idx);
                });
            });
        });

        post_request.on('error', function (err) {
            output_ref.lastmessage = 'Error:' + err;
            dbs.outputs.get(output_ref._id, function (err, result) {
                if (err) {
                    debug('API request result storage error after post error', err);
                    debug('Our output reference was', output_ref);
                    return;
                }
                output_ref._rev = result._rev;
                dbs.outputs.put(output_ref, function (err, result) {});
            });
            // We were not able to send the data - the output manager will retry
            cb(false, idx);
        });


        debug('Sending data to', post_options.host);
        output_ref.last = new Date().getTime();
        dbs.outputs.get(output_ref._id, function (err, result) {
            if (err) {
                debug('Result storage error after updating last attempt', err);
                debug('Our output reference was', output_ref);
                return;
            }
            output_ref._rev = result._rev;
            dbs.outputs.put(output_ref, function (err, result) {});
        });
        // debug(post_data);
        post_request.write(post_data);
        post_request.end();

    };

};