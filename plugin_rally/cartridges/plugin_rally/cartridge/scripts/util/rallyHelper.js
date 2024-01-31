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

function createApiProductLineItem(pli) {
    var productType = 'product_item';
    var apiLineItem = {
        _type: productType,
        adjusted_tax: pli.getAdjustedTax().getValueOrNull(),
        base_price: pli.getBasePrice().getValueOrNull(),
        bonus_product_line_item: pli.isBonusProductLineItem(),
        gift: pli.isGift(),
        item_id: pli.getUUID(),
        item_text: pli.getLineItemText(),
        price: pli.getPriceValue(),
        price_after_item_discount: pli.getAdjustedPrice().getValueOrNull(),
        price_after_order_discount: pli.getProratedPrice().getValueOrNull(),
        product_id: pli.getProductID(),
        product_name: pli.getProductName(),
        quantity: pli.getQuantityValue(),
        shipment_id: pli.shipment.getID(),
        tax: pli.getTax().getValueOrNull(),
        tax_basis: pli.getTaxBasis().getValueOrNull(),
        tax_class_id: pli.getTaxClassID(),
        tax_rate: pli.getTaxRate()
    };
    return apiLineItem;
}

function createApiAddressObject(address) {
    var returnAddress = {
        _type: 'order_address',
        address1: address.getAddress1(),
        address2: address.getAddress2() || null,
        city: address.getCity(),
        country_code: address.getCountryCode().getValue(),
        first_name: address.getFirstName(),
        full_name: address.getFullName(),
        id: address.getUUID(),
        last_name: address.getLastName(),
        phone: address.getPhone(),
        postal_code: address.getPostalCode(),
        state_code: address.getStateCode()
    };

    return returnAddress;
}

function createApiShippingMethod(shipment) {
    var shippingMethod = shipment.getShippingMethod();
    var respShipment = {
        _type: 'shipping_method',
        description: shippingMethod.getDescription(),
        id: shippingMethod.getID(),
        name: shippingMethod.getDisplayName(),
        price: shipment.getShippingLineItem('STANDARD_SHIPPING').getAdjustedNetPrice().getValueOrNull(),
        c_estimatedArrivalTime: shippingMethod.custom.estimatedArrivalTime,
        c_storePickupEnabled: shippingMethod.custom.storePickupEnabled
    };

    if (shipment.getShippingPriceAdjustments().length > 0) {
        var shipPromosIterator = shipment.getShippingPriceAdjustments().iterator();
        respShipment.shipping_promotions = [];
        while (shipPromosIterator.hasNext()) {
            var shipPromotion = shipPromosIterator.next();
            var apiShipPromotion = {
                _type: 'shipping_promotion',
                callout_msg: shipPromotion.getPromotion().getCalloutMsg().getMarkup(),
                link: '',
                promotion_id: shipPromotion.getPromotion().getID(),
                promotion_name: shipPromotion.getPromotion().getName()
            };
            respShipment.shipping_promotions.push(apiShipPromotion);
        }
    }

    return respShipment;
}

function prepareOrderObject(order) {
    var defaultShipment = order.getDefaultShipment();
    var orderResponse = {
        _type: 'order',
        confirmation_status: order.getConfirmationStatus().displayValue.toLowerCase(),
        order_no: order.getOrderNo(),
        billing_address: createApiAddressObject(order.getBillingAddress()),
        product_sub_total: defaultShipment.getMerchandizeTotalPrice().getValueOrNull(),
        tax_total: order.getTotalTax().getValueOrNull(),
        order_total: order.getTotalGrossPrice().getValueOrNull(),
        product_items: [],
        adjusted_merchandize_total_tax: order.getAdjustedMerchandizeTotalTax().getValueOrNull(),
        status: order.status.displayValue.toLowerCase(),
        shipments: []
    };
    var productsIterator = order.getAllProductLineItems().iterator();
    while (productsIterator.hasNext()) {
        var pli = productsIterator.next();
        var lineItem = createApiProductLineItem(pli);
        if (pli.isBundledProductLineItem()) {
            lineItem.bundled_product_items = [];
            var bundledIterator = pli.getBundledProductLineItems().iterator();
            while (bundledIterator.hasNext()) {
                var bundledProductLineItem = bundledIterator.next();
                var bundledLI = createApiProductLineItem(bundledProductLineItem);
                bundledLI._type = 'bundle_item'; // eslint-disable-line no-underscore-dangle
                lineItem.bundled_product_items.push(bundledLI);
            }
        }
        if (pli.isOptionProductLineItem()) {
            lineItem.option_items = [];
            var optionsIterator = pli.getOptionProductLineItems().iterator();
            while (optionsIterator.hasNext()) {
                var optionProductLineItem = optionsIterator.next();
                var optionLI = createApiProductLineItem(optionProductLineItem);
                optionLI._type = 'option_item'; // eslint-disable-line no-underscore-dangle
                optionLI.option_id = optionProductLineItem.getOptionID();
                optionLI.option_value_id = optionProductLineItem.getOptionValueID();
                lineItem.option_items.push(optionLI);
            }
        }
        orderResponse.product_items.push(lineItem);
    }

    var shipmentsIterator = order.getShipments().iterator();
    while (shipmentsIterator.hasNext()) {
        var shipment = shipmentsIterator.next();
        var respShipment = {
            _type: 'shipment',
            adjusted_merchandize_total_tax: shipment.getAdjustedMerchandizeTotalTax().getValueOrNull(),
            adjusted_shipping_total_tax: shipment.getAdjustedMerchandizeTotalTax().getValueOrNull(),
            gift: shipment.isGift(),
            merchandize_total_tax: shipment.getMerchandizeTotalTax().getValueOrNull(),
            product_sub_total: shipment.getMerchandizeTotalPrice().getValueOrNull(),
            product_total: shipment.getProratedMerchandizeTotalPrice().getValueOrNull(),
            shipping_address: createApiAddressObject(shipment.getShippingAddress()),
            shipment_id: shipment.getID(),
            shipment_total: shipment.getTotalGrossPrice().getValueOrNull(),
            shipping_status: shipment.getShippingStatus().getDisplayValue().toLowerCase(),
            shipping_total: shipment.getStandardShippingLineItem().getAdjustedPrice().getValueOrNull(),
            shipping_total_tax: shipment.getAdjustedShippingTotalTax().getValueOrNull(),
            tax_total: shipment.getTotalTax().getValueOrNull()
        };
        respShipment.shipping_method = createApiShippingMethod(shipment);
        orderResponse.shipments.push(respShipment);
    }

    return orderResponse;
}

function callCreateOrderHook(orderId) {
    var OrderMgr = require('dw/order/OrderMgr');
    var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');
    var currentService = 'rally.status_update';
    var order = OrderMgr.getOrder(orderId);
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var orderRequest = prepareOrderObject(order);
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
