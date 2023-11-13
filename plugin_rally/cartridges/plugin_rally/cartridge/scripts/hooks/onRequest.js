'use strict';

var Status = require('dw/system/Status');

/**
 * The onRequest hook function.
 */
exports.onRequest = function () {
    if (request.session.userName === 'storefront') {
        var BasketMgr = require('dw/order/BasketMgr');
        var currentBasket = BasketMgr.getCurrentBasket();
        if (currentBasket) {
            if (!session.privacy.basketId || session.privacy.basketId !== currentBasket.getUUID()) {
                session.privacy.basketId = currentBasket.getUUID();
            }
            var Site = require('dw/system/Site');
            var cookieToOrderSetting = Site.getCurrent().getCustomPreferenceValue('rallyCookieToOrderMapping');
            if (!empty(cookieToOrderSetting)) {
                var cookieToOrderMap = JSON.parse(cookieToOrderSetting);
                var Transaction = require('dw/system/Transaction');
                cookieToOrderMap.forEach(function (param) {
                    if (request.httpCookies[param.cookieName] && (!(param.attrName in currentBasket.custom) || currentBasket.custom[param.attrName] !== request.httpCookies[param.cookieName].value)) {
                        Transaction.wrap(function () {
                            currentBasket.custom[param.attrName] = request.httpCookies[param.cookieName].value;
                        });
                    }
                });
            }
        }
    }

    return new Status(Status.OK);
};
