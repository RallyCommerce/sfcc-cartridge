'use strict';
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var Transaction = require('dw/system/Transaction');

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
    var rallyBasketSessionObject = CustomObjectMgr.getCustomObject('RallySessionBasket', basketId);
    if (rallyBasketSessionObject) {
        Transaction.wrap(function () {
            CustomObjectMgr.remove(rallyBasketSessionObject);
        });
    }
}

function isAuthenticated(req) {
    var authKey = Site.getCurrent().getCustomPreferenceValue('rallySecret');
    var authToken = req.httpHeaders.authorization;

    if (authToken.indexOf(authKey) !== -1) {
        return true;
    }

    return false;
}

function calculateTaxes(requestBody) {
    var BasketMgr = require('dw/order/BasketMgr');
    var temporaryBasketsList = BasketMgr.getTemporaryBaskets();
    if (temporaryBasketsList.length > 0) {
        var basketsIterator = temporaryBasketsList.iterator();
        while (basketsIterator.hasNext()) {
            var tempBasket = basketsIterator.next();
            Transaction.wrap(function () {
                BasketMgr.deleteTemporaryBasket(tempBasket);
            });
        }
    }
    var ProductMgr = require('dw/catalog/ProductMgr');
    var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var temporaryBasket = BasketMgr.createTemporaryBasket();
    var defaultShipment = temporaryBasket.getDefaultShipment();
    var responseObject = {
        currency: temporaryBasket.getCurrencyCode()
    };
    responseObject.line_items = [];

    if (requestBody.shipping_address) {
        var shippingData = requestBody.shipping_address;
        var shippingAddress = defaultShipment.shippingAddress;

        Transaction.wrap(function () {
            temporaryBasket.setCustomerEmail('rallytax@rallyon.com');
            if (shippingAddress === null) {
                shippingAddress = defaultShipment.createShippingAddress();
            }

            shippingAddress.setFirstName('RallyTax');
            shippingAddress.setLastName('Calculate');
            shippingAddress.setAddress1(shippingData.address.address1);
            shippingAddress.setAddress2(shippingData.address.address2 ? shippingData.address.address2 : '');
            shippingAddress.setCity(shippingData.address.city);
            shippingAddress.setPostalCode(shippingData.address.postalCode);
            shippingAddress.setStateCode(shippingData.address.stateCode);
            var countryCode = shippingData.address.countryCode.value ? shippingData.address.countryCode.value : shippingData.address.countryCode;
            shippingAddress.setCountryCode(countryCode);
            shippingAddress.setPhone(shippingData.address.phone || '');

            ShippingHelper.selectShippingMethod(defaultShipment, shippingData.shippingMethod);
        });
    }

    if (requestBody.line_items && requestBody.line_items.length) {
        for (var i = 0; requestBody.line_items.length > i; i++) {
            var reqItem = requestBody.line_items[i];
            var productId = !empty(reqItem.variant_id) ? reqItem.variant_id : reqItem.product_id;
            var qty = !empty(reqItem.qty) ? parseFloat(reqItem.qty) : 1;
            var product = ProductMgr.getProduct(productId);
            var productOptionModel = null;
            Transaction.wrap(function () {
                var productLineItem = temporaryBasket.createProductLineItem(product, productOptionModel, defaultShipment);
                productLineItem.setQuantityValue(qty);
                basketCalculationHelpers.calculateTotals(temporaryBasket);
                var itemTaxResp = {
                    product_id: productId,
                    price: productLineItem.getPriceValue(),
                    tax_rate: productLineItem.getTaxRate(),
                    tax_value: productLineItem.getTax().getValue()
                };
                if (!empty(reqItem.variant_id)) {
                    itemTaxResp.product_id = productLineItem.getProduct().getMasterProduct().getID();
                    itemTaxResp.variant_id = productId;
                }
                responseObject.line_items.push(itemTaxResp);
            });
        }
    }
    var ShippingLineItem = require('dw/order/ShippingLineItem');
    responseObject.shipping_tax = defaultShipment.getShippingLineItem(ShippingLineItem.STANDARD_SHIPPING_ID).getTaxRate();

    Transaction.wrap(function () {
        BasketMgr.deleteTemporaryBasket(temporaryBasket);
    });
    return responseObject;
}

function callCreateOrderHook(orderId) {
    var OrderMgr = require('dw/order/OrderMgr');
    var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');
    var currentService = 'rally.status_update';
    var order = OrderMgr.getOrder(orderId);
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var orderRequest = {
        orderId: order.getOrderNo()
    };
    if (order.custom.basketId) {
        orderRequest.c_basketId = order.custom.basketId;
    }
    var params = {
        action: 'orders-create',
        reqBody: {
            orders: [
                orderRequest
            ]
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

module.exports = {
    rallyEnabled: rallyEnabled,
    rallyClientID: rallyClientID,
    getConfiguration: getConfiguration,
    createProductStockLine: createProductStockLine,
    createOrUpdateBasketSession: createOrUpdateBasketSession,
    updateCustomSessionVariables: updateCustomSessionVariables,
    removeSessionObject: removeSessionObject,
    isAuthenticated: isAuthenticated,
    calculateTaxes: calculateTaxes,
    callCreateOrderHook: callCreateOrderHook
};
