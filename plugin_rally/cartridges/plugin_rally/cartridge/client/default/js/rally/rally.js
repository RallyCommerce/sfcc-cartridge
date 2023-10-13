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
    }
};
