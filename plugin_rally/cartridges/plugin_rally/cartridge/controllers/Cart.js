'use strict';

var server = require('server');
server.extend(module.superModule);

server.append('Show', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');

    var currentBasket = BasketMgr.getCurrentBasket();
    if (currentBasket) {
        var rallyConfig = rallyPreferences.getConfiguration(currentBasket);

        res.setViewData({
            rallyEnabled: rallyPreferences.rallyEnabled,
            rallyClientID: rallyPreferences.rallyClientID,
            rallyConfig: rallyConfig
        });
    }
    return next();
});

server.append('MiniCartShow', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var rallyPreferences = require('*/cartridge/scripts/util/rallyHelper.js');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        var rallyConfig = rallyPreferences.getConfiguration(currentBasket);

        res.setViewData({
            rallyEnabled: rallyPreferences.rallyEnabled,
            rallyClientID: rallyPreferences.rallyClientID,
            rallyConfig: rallyConfig,
            isMinicart: true
        });
    }

    return next();
});

module.exports = server.exports();
