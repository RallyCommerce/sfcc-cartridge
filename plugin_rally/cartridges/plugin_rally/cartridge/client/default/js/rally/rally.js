'use strict';

module.exports = {
    basketChange: function () {
        $('body').on('cart:update product:afterAddToCart', function (event, data) {
            if (data && data.action === 'Cart-AddProduct') {
                window.RallyCheckoutData.id = data.cart.basketId;
                if (data.cart.yotpoCartTokken && window.RallyCheckoutData.customerData) {
                    window.RallyCheckoutData.customerData.externalCartToken = encodeURIComponent(data.cart.yotpoCartTokken);
                }
            } else if (data && data.action === 'Cart-RemoveProductLineItem') {
                window.RallyCheckoutData.id = data.basket.basketId;
                if (data.basket.yotpoCartTokken && window.RallyCheckoutData.customerData) {
                    window.RallyCheckoutData.customerData.externalCartToken = encodeURIComponent(data.basket.yotpoCartTokken);
                }
            }
        });
    },
    updateCheckout: function () {
        var RallyCheckoutData = window.RallyCheckoutData || {};
        RallyCheckoutData.refresh = function (callback) {
            var url = RallyCheckoutData.refreshUrl || '';
            $.spinner().start();
            $.ajax({
                url: url,
                method: 'GET',
                success: function (data) {
                    var tempSummary = $('<div />');
                    tempSummary.append(data.order.productSummaryHtml);
                    var orderSummary = $(tempSummary).find('.order-product-summary')[0];
                    $('.order-product-summary').html($(orderSummary).html());
                },
                error: function () {
                    $.spinner().stop();
                }
            })
            .done( function (data) {
                $('body').trigger('checkout:updateCheckoutView',
                    { order: data.order, customer: data.customer, options: { keepOpen: true } });
                $.spinner().stop();
                if (callback) {
                    callback();
                }
            });

            return true;
        };
    }
};
