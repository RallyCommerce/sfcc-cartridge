'use strict';

exports.afterPATCH = function (order, orderInput) {
    var Site = require('dw/system/Site');
    var yotpoCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('yotpoCartridgeEnabled');
    if (yotpoCartridgeEnabled) {
        if (orderInput.status && orderInput.status.toUpperCase() === 'NEW') {
            if (order.status.displayValue.toUpperCase() === 'NEW') {
                var LoyaltyCOCreator = require('*/cartridge/scripts/loyalty/export/loyaltyOrderCO');
                LoyaltyCOCreator.createLoyaltyOrderCO({
                    orderNo: order.getCurrentOrderNo(),
                    orderState: 'created',
                    locale: order.getCustomerLocaleID()
                });
            }
        }
    }
};
