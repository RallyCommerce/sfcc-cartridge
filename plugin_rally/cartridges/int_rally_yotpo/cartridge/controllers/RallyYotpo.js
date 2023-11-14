'use strict';

/**
 * @module controllers/RallyYotpo
 *
 * This is main controller for Rally Yotpo extension.
 *
 */

var server = require('server');

server.get('HtmlHead', server.middleware.include, function (req, res, next) {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var yotpoLogger = require('*/cartridge/scripts/utils/yotpoLogger');
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    var currLocale = req.locale.id;
    var isLoyaltyEnabled = YotpoConfigurationModel.getYotpoPref('yotpoLoyaltyEnabled', currLocale);
    var templateParams = res.viewData;

    var templateFile = 'rally/headerExtend';

    if (isCartridgeEnabled) {
        if (isLoyaltyEnabled) {
            var BasketMgr = require('dw/order/BasketMgr');
            var currentBasket = BasketMgr.getCurrentBasket();
            if (currentBasket) {
                var CommonModel = require('*/cartridge/models/common/commonModel');
                var basketDetails = CommonModel.getCurrentBasketDetails(currLocale);
                templateParams.yotpoCartTokken = basketDetails.basketTokken;
                templateParams.isCartridgeEnabled = isCartridgeEnabled;
            }
        }
        try {
            res.render(templateFile, templateParams);
        } catch (ex) {
            yotpoLogger.logMessage('Something went wrong while loading the Yotpo header scripts template, Exception code is: ' + ex, 'error', 'scripts/header/rallyCheckoutData.js');
        }
    }

    next();
});

module.exports = server.exports();
