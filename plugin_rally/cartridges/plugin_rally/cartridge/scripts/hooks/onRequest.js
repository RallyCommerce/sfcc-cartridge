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
        }
    }

    return new Status(Status.OK);
};
