'use strict';

/**
 * Initialize  HTTP service
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Site = require('dw/system/Site');

function rallyService(currService) {
    var rallyServiceObj = LocalServiceRegistry.createService(currService, {
        createRequest: function (svc, params) {
            var reqbody = params.reqBody;
            var secret = Site.getCurrent().getCustomPreferenceValue('rallySecret'); // In case we want to use global secret
            svc.setAuthentication('NONE');
            svc.addHeader('Authorization', 'Bearer ' + secret);
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Accept', '*/*');
            svc.setRequestMethod(params.reqMethod);
            if (params.action) {
                svc.setURL(svc.getURL() + params.action);
            }

            return JSON.stringify(reqbody);
        },
        parseResponse: function (svc, client) {
            return client.text;
        },
        /* eslint-disable */
        mockCall: function (service, request) {
            return {
                success: true
            };
        },
        /* eslint-enable */
        filterLogMessage: function (msg) {
            return msg;
        },
        getRequestLogMessage: function (request) {
            return request;
        },
        getResponseLogMessage: function (response) {
            return response.text;
        }
    });

    return rallyServiceObj;
}

module.exports = {
    rallyService: rallyService
};
