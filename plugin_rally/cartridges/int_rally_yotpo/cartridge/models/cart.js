'use strict';

var base = module.superModule;

/**
 * @constructor
 * @classdesc CartModel class that represents the current basket
 *
 * @param {dw.order.Basket} basket - Current users's basket
 */
function CartModel(basket) {
    base.call(this, basket);
    if (basket) {
        var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
        var currLocale = request.locale;
        var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
        var isLoyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currLocale);
        if (isCartridgeEnabled && isLoyaltyEnabled) {
            var CommonModel = require('*/cartridge/models/common/commonModel');
            var basketDetails = CommonModel.getCurrentBasketDetails(currLocale);
            this.yotpoCartTokken = basketDetails.basketTokken;
        }
    }
}

CartModel.prototype = Object.create(base.prototype);

module.exports = CartModel;
