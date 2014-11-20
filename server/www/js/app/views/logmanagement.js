/*
 * Log management.
 *
 * Our model is the settings object.
 *
 * This is a generic view, all devices display this.
 *
 * (c) 2014 Edouard Lafargue, ed@lafargue.name
 * All rights reserved.
 */

define(function(require) {
    
    "use strict";
    
    var $       = require('jquery'),
        _       = require('underscore'),
        Backbone = require('backbone'),
        template = require('js/tpl/LogManagementView.js');
    
    require('bootstrap');

    return Backbone.View.extend({

        initialize:function () {

            this.deviceLogs = this.collection;
            this.selectedLogs = [];        
        },

        events: {
            "click a": "handleaclicks",
            "change .logcheckbox": "refreshLogList",
            "click .displaylog": "displayLog",
            "click .delete_log": "deleteLog",
            "click #do-delete": "doDeleteLog",
        },

        /* Nice way to disable an anchor button when it is disabled */
        handleaclicks: function(event) {
            if ($(event.currentTarget).attr('disabled'))
                event.preventDefault();
        },


        // Called when a checkbox is clicked
        refreshLogList: function() {
            var list = $('.logcheckbox',this.el);
            // Create a list of all checked entry IDs
            var entries=[];
            _.each(list, function(entry) {
                if (entry.checked)
                    entries.push(entry.value);
            });
            this.selectedLogs = entries;
            this.render();
        },

        displayLog: function() {
            if ($('.displaylog', this.el).attr('disabled'))
                return false;
            router.navigate('displaylogs/' + instrumentManager.getInstrument().id + '/' + this.selectedLogs.join(','),true);
            return false;
        },

        deleteLog: function(event) {
            var data = $(event.currentTarget).data();
            $('#do-delete', this.el).data('id',data.id);
            $('#deleteConfirm',this.el).modal('show');

        },

        doDeleteLog: function(event) {
            var self = this;
            var logToDelete = this.deviceLogs.where({_id: $(event.currentTarget).data('id')});
            var points = logToDelete[0].entries.size();
            // Ask our user to be patient:
            $("#deleteConfirm .modal-body .intro", this.el).html("Deleting log, please wait...");
            
            // We want to listen for entry deletion events, the process is async and we don't
            // want to let the user continue while the backend is busy deleting stuff...
            this.listenTo(logToDelete[0],"entry_destroy",function(num) {
                $("#entries-del",self.el).width(Math.ceil((1-num/points)*100) + "%");
                if (num <= 1) {
                    $('#deleteConfirm',self.el).modal('hide');
                    self.stopListening(logToDelete[0]);
                    self.render();
                }
            });
            
            // the backend will take care of deleting all the log entries associated with
            // the log.
            logToDelete[0].destroy(
                                {success: function(model, response) {
                                    },
                                 error: function(model, response) {
                                     console.log("Log delete error" + response);
                                 }
                                });
        },

        render:function () {
            var self = this;
            console.log('Main render of Log management view');
            
            
            $(this.el).html(template({ deviceLogs: this.collection.toJSON(), selected: this.selectedLogs,
                                      instrumentid: instrumentManager.getInstrument().id}));

            // Depending on device capabilities, enable/disable "device logs" button
            if (instrumentManager.getCaps().indexOf("LogManagementView") == -1 || ! linkManager.isConnected()) {
                    $('.devicelogs',self.el).attr('disabled', true);
            }
            
            // Now, we only want to scroll the table, not the whole page:
            var tbheight = window.innerHeight - $('#id1',this.el).height() - $('.header .container').height() - 20;
            $('#tablewrapper',this.el).css('max-height',
                                       tbheight + 'px'
                                            );
            
            return this;
        },

        onClose: function() {
            console.log("Log management view closing...");

            // Restore the settings since we don't want them to be saved when changed from
            // the home screen
            settings.fetch();
        },

    });
});