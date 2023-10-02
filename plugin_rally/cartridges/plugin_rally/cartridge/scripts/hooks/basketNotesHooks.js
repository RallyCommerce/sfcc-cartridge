'use strict';

var Status = require('dw/system/Status');

exports.beforeGET = function (basketId) {
    if (basketId) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basketId);
    }

    return new Status(Status.OK);
};
// eslint-disable-next-line no-unused-vars
exports.beforePOST = function (basketId, note) {
    if (basketId) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basketId);
    }

    return new Status(Status.OK);
};
// eslint-disable-next-line no-unused-vars
exports.beforeDELETE = function (basket, note) {
    if (basket) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basket.UUID);
    }

    return new Status(Status.OK);
};
