'use strict';

var Status = require('dw/system/Status');

exports.modifyGETResponse = function (doc) {
    var TaxMgr = require('dw/order/TaxMgr');
    var Site = require('dw/system/Site');
    var taxPolicy = TaxMgr.getTaxationPolicy();
    doc.addFlash({
        type: 'TaxationPolicy',
        message: taxPolicy
    });
    var globalShippingCountries = Site.getCurrent().getCustomPreferenceValue('rallyShippingCountriesConfig');
    doc.addFlash({
        type: 'ShippingCountries',
        message: globalShippingCountries
    });

    return new Status(Status.OK);
};
