'use strict';

exports.afterPATCH = function (order, orderInput) {
    var Site = require('dw/system/Site');
    var yotpoCartridgeEnabled = Site.getCurrent().getCustomPreferenceValue('yotpoCartridgeEnabled');
    if (yotpoCartridgeEnabled) {
        var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
        var isLoyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', order.getCustomerLocaleID());
        if (isLoyaltyEnabled) {
            if (orderInput.status && orderInput.status.toUpperCase() === 'NEW') {
                if (order.status.displayValue.toUpperCase() === 'NEW') {
                    try {
                        var LoyaltyCOCreator = require('*/cartridge/scripts/loyalty/export/loyaltyOrderCO');
                        LoyaltyCOCreator.createLoyaltyOrderCO({
                            orderNo: order.getCurrentOrderNo(),
                            orderState: 'created',
                            locale: order.getCustomerLocaleID()
                        });
                    } catch (ex) {
                        // Errors creating CO are already being captured in loyaltyOrderCO
                    }
                }
            }
        }
    }
};
