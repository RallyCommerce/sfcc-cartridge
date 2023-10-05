'use strict';

/**
 * Renders yotpo scripts inline using ISML.renderTemplate
 *
 * @param {Object} params - parameters required by yotpoHeader isml template
 */
function htmlHead(params) {
    var ISML = require('dw/template/ISML');
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var currLocale = request.locale;
    var isLoyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currLocale);
    var templateParams = params || {};

    var templateFile = 'rally/headerExtend';

    if (isCartridgeEnabled) {
        if (isLoyaltyEnabled) {
            var BasketMgr = require('dw/order/BasketMgr');
            var currentBasket = BasketMgr.getCurrentBasket();
            if (currentBasket && session.isCustomerAuthenticated() && session.getCustomer().getProfile()) {
                var CommonModel = require('*/cartridge/models/common/commonModel');
                var basketDetails = CommonModel.getCurrentBasketDetails(currLocale);
                templateParams.yotpoCartTokken = basketDetails.basketTokken;
            }
        }
        try {
            ISML.renderTemplate(templateFile, templateParams);
        } catch (ex) {
            yotpoLogger.logMessage('Something went wrong while loading the Yotpo header scripts template, Exception code is: ' + ex, 'error', 'scripts/header/rallyCheckoutData.js');
        }
    }
}

module.exports = {
    htmlHead: htmlHead
};
