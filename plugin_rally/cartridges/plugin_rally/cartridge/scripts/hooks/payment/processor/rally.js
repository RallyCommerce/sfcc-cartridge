'use strict';
var Resource = require('dw/web/Resource');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');

/**
 * Rally payment hook isn't supported on Storefront
 * @return {Object} an object that contains error information
 */
function Handle() {
    var errors = [];
    errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
    return { fieldErrors: [], serverErrors: errors, error: true };
}

/**
 * Rally payment hook isn't supported on Storefront
 * @return {Object} an object that contains error information
 */
function Authorize() {
    var errors = [];
    errors.push(Resource.msg('error.payment.processor.not.supported', 'checkout', null));
    return { fieldErrors: [], serverErrors: errors, error: true };
}

/**
 *
 * @param {Object} invoice Return/Appeasement Invoice
 * @return {Object} an object that contains success/error information
 */
function Refund(invoice) {
    var Logger = require('dw/system/Logger').getLogger('Refund-Orders', 'Refund-Orders');

    var order = invoice.getOrder();
    var paymentInstrument = order.getPaymentInstruments('Rally').iterator().next();
    var paymentTransaction = paymentInstrument.getPaymentTransaction();
    var transactionID = paymentInstrument.custom.rallyExternalId;
    var amount = invoice.getGrandTotal().getGrossPrice().getValue();

    var data = {};
    data.external_id = invoice.getInvoiceNumber();
    data.external_order_id = order.getCurrentOrderNo();
    data.amount = amount;
    data.transaction_id = transactionID;

    var params = {
        action: 'orders-refund',
        reqBody: data,
        reqMethod: 'POST'
    };

    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var responseData = rallyService.call(params);

    if (responseData && responseData.ok === true) {
        paymentTransaction.setType(paymentTransaction.TYPE_CREDIT);
        Logger.debug('Rally Orders refund API successfully executed for order No: {0}', order.orderNo);
        return { success: true };
    }

    Logger.debug('no response from Rally API');

    return { success: false };
}

/**
 *
 * @param {Object} order Order object
 * @param {Object} rallyTransaction Payment Transaction to release Auth
 * @return {Object} an object that contains success/error information
 */
function Release(order, rallyTransaction) {
    var paymentTransaction = !empty(rallyTransaction) ? rallyTransaction : '';
    var paymentInstrument = order.getPaymentInstruments('Rally').iterator().next();
    if (empty(paymentTransaction)) {
        paymentTransaction = paymentInstrument.getPaymentTransaction();
    }
    var transactionID = paymentInstrument.custom.rallyExternalId;

    var data = {};
    data.external_id = order.getCurrentOrderNo();
    data.external_order_id = order.getCurrentOrderNo();
    data.transaction_id = transactionID;

    var params = {
        action: 'orders-release',
        reqBody: data,
        reqMethod: 'POST'
    };

    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var responseData = rallyService.call(params);

    if (responseData && responseData.ok === true) {
        // paymentTransaction.setTransactionID(responseData.object.authorizationid);
        paymentTransaction.setType(paymentTransaction.TYPE_AUTH_REVERSAL);
        return { success: true };
    }
    return { success: false };
}

exports.Handle = Handle;
exports.Authorize = Authorize;
exports.Refund = Refund;
exports.Release = Release;
