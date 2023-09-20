'use strict';

var Status = require('dw/system/Status');

exports.beforePUT = function (basket, customerInfo) {
    if (basket) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basket.UUID);
    }

    return new Status(Status.OK);
};
