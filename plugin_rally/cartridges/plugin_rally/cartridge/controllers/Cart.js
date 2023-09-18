'use strict';

var server = require('server');
server.extend(module.superModule);

server.append('AddProduct', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyPreferences.createOrUpdateBasketSession(currentBasket);
    }
    return next();
});

server.append('UpdateQuantity', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyPreferences.createOrUpdateBasketSession(currentBasket);
    }
    return next();
});

server.append('AddBonusProducts', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyPreferences.createOrUpdateBasketSession(currentBasket);
    }
    return next();
});

server.append('RemoveProductLineItem', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyPreferences.createOrUpdateBasketSession(currentBasket);
    }
    return next();
});

module.exports = server.exports();
