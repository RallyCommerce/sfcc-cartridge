'use strict';

var Status = require('dw/system/Status');

// eslint-disable-next-line no-unused-vars
exports.modifyGETResponse = function (basket, basketResponse) {
    var TaxMgr = require('dw/order/TaxMgr');
    var taxPolicy = TaxMgr.getTaxationPolicy();
    // eslint-disable-next-line no-param-reassign
    basketResponse.c_taxPolicy = taxPolicy;

    return new Status(Status.OK);
};

exports.beforeGET = function (basketId) {
    if (basketId) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basketId);
    }

    return new Status(Status.OK);
};
