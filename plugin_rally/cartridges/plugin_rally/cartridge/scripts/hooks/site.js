exports.modifyGETResponse = function (doc) {
    var TaxMgr = require('dw/order/TaxMgr');
    var taxPolicy = TaxMgr.getTaxationPolicy();
    doc.addFlash({
        type: 'TaxationPolicy',
        message: taxPolicy
    });
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var shippingForm = COHelpers.prepareShippingForm();

    var shippingCountries = shippingForm.shippingAddress.addressFields.country.options;
    var shippingCountriesReq = shippingCountries.map(function (country) {
        return country.id;
    });
    doc.addFlash({
        type: 'ShippingCountries',
        message: shippingCountriesReq.toString()
    });
};
