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

module.exports = {
    rallyEnabled: rallyEnabled,
    rallyClientID: rallyClientID,
    getConfiguration: getConfiguration,
    createProductStockLine: createProductStockLine
};
