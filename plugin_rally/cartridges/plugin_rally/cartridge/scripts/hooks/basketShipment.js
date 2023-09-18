'use strict';

var Status = require('dw/system/Status');
// eslint-disable-next-line no-unused-vars
exports.beforePATCH = function (basket, shipment, shipmentInfo) {
    if (basket) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basket.UUID);
    }
    return new Status(Status.OK);
};
