'use strict';

var Status = require('dw/system/Status');

exports.beforePATCH = function (order, paymentInstrument, newPaymentInstrument) {
    if (newPaymentInstrument && newPaymentInstrument.payment_method_id.toLowerCase() === 'rally') {
        paymentInstrument.custom.rallyCardLast4 = newPaymentInstrument.c_rallyCardLast4 || null;
        paymentInstrument.custom.rallyPaymentProcessorName = newPaymentInstrument.c_rallyPaymentProcessorName;
        paymentInstrument.custom.rallyPaymentMethodName = newPaymentInstrument.c_rallyPaymentMethodName;
        paymentInstrument.custom.rallyExternalId = newPaymentInstrument.c_rallyExternalId;
        paymentInstrument.custom.rallyCardBrand = newPaymentInstrument.c_rallyCardBrand || null;
        paymentInstrument.custom.rallyCheckoutSessionId = newPaymentInstrument.c_rallyCheckoutSessionId;
        if (newPaymentInstrument.c_rallyCheckoutSessionId) {
            order.custom.rallyCheckoutSessionId = newPaymentInstrument.c_rallyCheckoutSessionId;
        }
    }

    return new Status(Status.OK);
};

exports.beforePOST = function (order, newPaymentInstrument) {
    if (newPaymentInstrument && newPaymentInstrument.payment_method_id.toLowerCase() === 'rally') {
        if (newPaymentInstrument.c_rallyCheckoutSessionId) {
            order.custom.rallyCheckoutSessionId = newPaymentInstrument.c_rallyCheckoutSessionId;
        }
    }

    return new Status(Status.OK);
};
