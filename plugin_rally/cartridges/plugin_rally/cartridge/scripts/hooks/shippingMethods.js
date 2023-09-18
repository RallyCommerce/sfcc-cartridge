'use strict';

var Status = require('dw/system/Status');
// eslint-disable-next-line no-unused-vars
exports.beforeGET = function (basketId, shipmentId) {
    if (basketId) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basketId);
    }

    return new Status(Status.OK);
};
