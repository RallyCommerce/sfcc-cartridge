'use strict';
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

var rallyEnabled = Site.getCurrent().getCustomPreferenceValue('rallyEnabled');
var rallyClientID = Site.getCurrent().getCustomPreferenceValue('rallyClientID');

function getConfiguration(currentBasket) {
    var cartID = currentBasket.UUID;
    var storeCurrency = currentBasket.currencyCode.toString();
    var checkoutURL = URLUtils.https('Checkout-Begin').toString();

    var cookies = request.getHttpCookies();
    var dwsid = null;
    for (var i = 0; i < cookies.getCookieCount(); i++) {
        if (cookies[i] && cookies[i].name === 'dwsid') {
            dwsid = cookies[i].value;
        }
    }

    return {
        cartData: {
            id: cartID,
            dwsid: dwsid,
            currency: storeCurrency
        },
        redirect: true,
        fallbackUrl: checkoutURL,
        fallbackButtonSelector: 'checkout-btn'
    };
}

function createProductStockLine(productId, inventoryRecord, masterProductId) {
    var inventoryObject = {};
    if (masterProductId) {
        inventoryObject.externalProductId = masterProductId;
        inventoryObject.externalVariantId = productId;
    } else {
        inventoryObject.externalProductId = productId;
        inventoryObject.externalVariantId = null;
    }

    inventoryObject.allocation = inventoryRecord.getAllocation().getValue();
    inventoryObject.quantity = inventoryRecord.getStockLevel().getValue();

    return inventoryObject;
}

function createOrUpdateBasketSession(basket) {
    var Transaction = require('dw/system/Transaction');
    var sessionCustomConfigs = session.getCustom();
    var customSessionObj = {};
    Object.keys(sessionCustomConfigs).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(sessionCustomConfigs, key)) {
            customSessionObj[key] = sessionCustomConfigs[key];
        }
    });
    var basketId = basket.UUID;
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var rallyBasketSessionObject = CustomObjectMgr.getCustomObject('RallySessionBasket', basketId);
    Transaction.wrap(function () {
        if (!rallyBasketSessionObject) {
            rallyBasketSessionObject = CustomObjectMgr.createCustomObject('RallySessionBasket', basketId);
        }
        rallyBasketSessionObject.custom.sessionStorage = JSON.stringify(customSessionObj);
    });

    return true;
}

function updateCustomSessionVariables(basketId) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var rallyBasketSessionObject = CustomObjectMgr.getCustomObject('RallySessionBasket', basketId);
    if (rallyBasketSessionObject && rallyBasketSessionObject.custom.sessionStorage) {
        var sessionVars = JSON.parse(rallyBasketSessionObject.custom.sessionStorage);
        Object.keys(sessionVars).forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(sessionVars, key)) {
                request.session.custom[key] = sessionVars[key];
            }
        });
    }

    return true;
}

function removeSessionObject(basketId) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var Transaction = require('dw/system/Transaction');
    var rallyBasketSessionObject = CustomObjectMgr.getCustomObject('RallySessionBasket', basketId);
    Transaction.wrap(function () {
        CustomObjectMgr.remove(rallyBasketSessionObject);
    });
}

module.exports = {
    rallyEnabled: rallyEnabled,
    rallyClientID: rallyClientID,
    getConfiguration: getConfiguration,
    createProductStockLine: createProductStockLine,
    createOrUpdateBasketSession: createOrUpdateBasketSession,
    updateCustomSessionVariables: updateCustomSessionVariables,
    removeSessionObject: removeSessionObject
};
