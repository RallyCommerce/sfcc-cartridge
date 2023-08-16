// eslint-disable-next-line no-unused-vars
exports.modifyGETResponse = function (basket, basketResponse) {
    var TaxMgr = require('dw/order/TaxMgr');
    var taxPolicy = TaxMgr.getTaxationPolicy();
    // eslint-disable-next-line no-param-reassign
    basketResponse.c_taxPolicy = taxPolicy;
};
