'use strict';

var Logger = require('dw/system/Logger').getLogger('rally');
var Status = require('dw/system/Status');

function sendInventoryUpdate(order) {
    var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');
    var collections = require('*/cartridge/scripts/util/collections');
    var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
    var productsArray = [];

    collections.forEach(order.getProductLineItems(), function (item) {
        var masterProductId = null;
        if (item.getProduct().isVariant()) {
            masterProductId = item.getProduct().getMasterProduct().getID();
        }
        if (item.getProduct().getAvailabilityModel().getInventoryRecord()) {
            productsArray.push(rallyHelper.createProductStockLine(item.getProductID(), item.getProduct().getAvailabilityModel().getInventoryRecord(), masterProductId));
        }
    });
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'products-inventory-update',
        reqBody: {
            products: productsArray
        },
        reqMethod: 'POST'
    };

    var result = rallyService.call(params);
    return result;
}

/**
 * Sends a confirmation to the current user
 * @param {dw.order.Order} order - The current user's order
 * @returns {void}
 */
function sendConfirmationMail(order) {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var Site = require('dw/system/Site');
    Logger.warn('Rally email start for: ' + order.getCurrentOrderNo());
    try {
        var enableLocalConfirmationEmail = Site.getCurrent().getCustomPreferenceValue('rallyEnableConfirmationEmail');
        var enableCustomHookEmail = Site.getCurrent().getCustomPreferenceValue('rallyEnableCustomHookEmail');
        if (order.getCustomerEmail()) {
            if (enableLocalConfirmationEmail && !enableCustomHookEmail) {
                COHelpers.sendConfirmationEmail(order, order.getCustomerLocaleID());
                Logger.warn('After Send Confirmation Email for Order: ' + order.getCurrentOrderNo());
                return true;
            } else if (enableCustomHookEmail) {
                var hookSettings = Site.getCurrent().getCustomPreferenceValue('rallyCustomEmailHookSettings');
                if (!empty(hookSettings)) {
                    var hookObj = JSON.parse(hookSettings);
                    var HookMgr = require('dw/system/HookMgr');
                    if (HookMgr.hasHook(hookObj.extensionPoint)) {
                        var params = hookObj.params;
                        params.forEach(function (element, index) {
                            if (element === 'order') {
                                params[index] = order;
                            }
                        });
                        var hookResult = '';
                        switch (params.length) {
                            case 1:
                                hookResult = HookMgr.callHook(hookObj.extensionPoint, hookObj.functionName, params[0]);
                                break;
                            case 2:
                                hookResult = HookMgr.callHook(hookObj.extensionPoint, hookObj.functionName, params[0], params[1]);
                                break;
                            case 3:
                                hookResult = HookMgr.callHook(hookObj.extensionPoint, hookObj.functionName, params[0], params[1], params[2]);
                                break;
                            default:
                                break;
                        }
                        if (!hookResult) {
                            return false;
                        }
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        Logger.warn('Confirmation Email error: ' + e.message);
        return false;
    }
    return false;
}

exports.beforePATCH = function (order, orderInput) {
    var collections = require('*/cartridge/scripts/util/collections');
    var OrderMgr = require('dw/order/OrderMgr');
    var Order = require('dw/order/Order');
    if (orderInput.status) {
        var Transaction = require('dw/system/Transaction');
        // finalize order
        if (order.status.displayValue.toUpperCase() === 'CREATED' && orderInput.status.toUpperCase() === 'NEW') {
            Logger.warn('Start placing Order: ' + order.getCurrentOrderNo());
            OrderMgr.placeOrder(order);
            order.setExportStatus(Order.EXPORT_STATUS_READY);
            Logger.warn('End placing Order: ' + order.getCurrentOrderNo());
        }
        // stop temporary order and give basket back
        if (order.status.displayValue.toUpperCase() === 'CREATED' && orderInput.status.toUpperCase() === 'FAILED') {
            OrderMgr.failOrder(order);
        }

        if (orderInput.status.toUpperCase() === 'CANCELLED') {
            Transaction.wrap(function () {
                OrderMgr.cancelOrder(order);
            });
        }
        // Update Rally order statuses
        order.custom.statusSentToRally = order.getStatus().getValue();
        order.custom.lastShipStatusSentToRally = order.getShippingStatus().getValue();
    }
    if (orderInput.payment_status && orderInput.payment_status.toUpperCase() === 'PAID') {
        order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
    }
    if (orderInput.confirmation_status && orderInput.confirmation_status.toUpperCase() === 'CONFIRMED') {
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
    }

    var ppoProducts = orderInput.product_items ? orderInput.product_items.toArray() : [];
    if (ppoProducts.length > 0) {
        var ProductMgr = require('dw/catalog/ProductMgr');
        var defaultShipment = order.getDefaultShipment();
        var returnStatus = new Status(Status.ERROR, 'out_of_stock', 'There isn\'t enough stock.', {});
        ppoProducts.forEach(function (ppoProduct) {
            var product = ProductMgr.getProduct(ppoProduct.product_id);
            var qty = parseInt(ppoProduct.quantity.toString(), 10);
            if (product.getAvailabilityModel().getInventoryRecord().getStockLevel().value >= qty) {
                var productLineItem = order.createProductLineItem(ppoProduct.product_id, defaultShipment);
                productLineItem.setQuantityValue(qty);
                productLineItem.setPriceValue(ppoProduct.price.get());
                productLineItem.setTaxRate(ppoProduct.tax_rate.get());
                productLineItem.updateTax(productLineItem.getTaxRate());
            } else {
                var oosProductDetails = {
                    product_id: ppoProduct.product_id,
                    quantity: product.getAvailabilityModel().getInventoryRecord().getStockLevel().value
                };
                returnStatus.addDetail(ppoProduct.product_id, oosProductDetails);
            }
        });
        if (returnStatus.getDetails().length > 0) {
            return returnStatus;
        }
        order.updateTotals();
    }

    if (orderInput.shipping_items && orderInput.shipping_items.length > 0) {
        var inputShippingItems = orderInput.shipping_items.toArray();
        inputShippingItems.forEach(function (inputShippingItem) {
            var shipment = order.getShipment(inputShippingItem.shipmentId);
            var uuid = inputShippingItem.itemId || 'FLAT_RATE';
            var taxClassID = inputShippingItem.taxClassId;
            var shippingLI = collections.find(shipment.getAllLineItems(), function (item) {
                return item.UUID === uuid;
            });
            if (empty(shippingLI)) {
                shippingLI = shipment.createShippingLineItem(uuid);
            }
            shippingLI.setLineItemText(inputShippingItem.itemText);
            shippingLI.setPriceValue(inputShippingItem.price.get());
            shippingLI.setTaxClassID(taxClassID);
            shippingLI.setTaxRate(inputShippingItem.taxRate.get());
            shippingLI.updateTax(shippingLI.getTaxRate());
        });
        order.updateTotals();
    }

    if (orderInput.payment_instruments && orderInput.payment_instruments.length > 0) {
        var Money = require('dw/value/Money');
        var inputPayments = orderInput.payment_instruments.toArray();
        inputPayments.forEach(function (inputPI) {
            var PICollection = order.getPaymentInstruments(inputPI.payment_method_id);
            var PI = PICollection.toArray()[0];
            var amount = new Money(inputPI.amount.get(), order.getCurrencyCode());
            PI.getPaymentTransaction().setAmount(amount);
        });
        order.updateTotals();
    }
    return new Status(Status.OK);
};

// eslint-disable-next-line no-unused-vars
exports.afterPOST = function (order, orderInput) {
    var result = sendInventoryUpdate(order);
    if (!result.ok) {
        Logger.warn('Inventory update failed: ' + order.getCurrentOrderNo());
    }
    if (request.session.custom.basketId) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.removeSessionObject(request.session.custom.basketId);
    }
    return new Status(Status.OK);
};

// eslint-disable-next-line no-unused-vars
exports.afterPATCH = function (order, orderInput) {
    if (orderInput.status && orderInput.status.toUpperCase() === 'NEW') {
        var result = sendInventoryUpdate(order);
        if (!result.ok) {
            Logger.warn('Inventory update failed: ' + order.getCurrentOrderNo());
        }
        var confirmationEmailSent = sendConfirmationMail(order);
        if (!confirmationEmailSent) {
            Logger.warn('Email not sent for order: ' + order.getCurrentOrderNo());
        }
    }
    return new Status(Status.OK);
};

exports.beforePOST = function (basket) {
    if (basket) {
        var rallyHelper = require('*/cartridge/scripts/util/rallyHelper.js');
        rallyHelper.updateCustomSessionVariables(basket.UUID);
        request.session.custom.basketId = basket.UUID;
    }
    return new Status(Status.OK);
};

exports.sendConfirmationMail = sendConfirmationMail;
