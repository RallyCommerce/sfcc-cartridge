'use strict';

var server = require('server');
server.extend(module.superModule);

server.append('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        // Set custom attribute to the basket
        Transaction.wrap(function () {
            currentBasket.custom.basketId = currentBasket.getUUID();
        });
    }
    return next();
});

module.exports = server.exports();
