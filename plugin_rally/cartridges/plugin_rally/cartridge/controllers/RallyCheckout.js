'use strict';

var server = require('server');

server.get('Get', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var AccountModel = require('*/cartridge/models/account');
    var OrderModel = require('*/cartridge/models/order');
    var Locale = require('dw/util/Locale');
    var Resource = require('dw/web/Resource');
    var URLUtils = require('dw/web/URLUtils');
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var validationHelpers = require('*/cartridge/scripts/helpers/basketValidationHelpers');
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');

    var currentBasket = BasketMgr.getCurrentBasket();
    if (!currentBasket) {
        res.json({
            redirectUrl: URLUtils.url('Cart-Show').toString(),
            error: true
        });

        return next();
    }

    var validatedProducts = validationHelpers.validateProducts(currentBasket);
    if (validatedProducts.error) {
        res.redirect(URLUtils.url('Cart-Show'));
        return next();
    }

    var currentLocale = Locale.getLocale(req.locale.id);
    var allValid = COHelpers.ensureValidShipments(currentBasket);
    var basketModel = new OrderModel(
        currentBasket,
        { countryCode: currentLocale.country, containerView: 'basket' }
    );

    var productSummaryContext = { order: basketModel };
    var productSummaryTemplate = 'checkout/orderProductSummary';
    var renderedHtml = renderTemplateHelper.getRenderedHtml(
        productSummaryContext,
        productSummaryTemplate
    );
    basketModel.productSummaryHtml = renderedHtml;

    res.json({
        order: basketModel,
        customer: new AccountModel(req.currentCustomer),
        error: !allValid,
        message: allValid ? '' : Resource.msg('error.message.shipping.addresses', 'checkout', null)
    });

    return next();
});

module.exports = server.exports();
