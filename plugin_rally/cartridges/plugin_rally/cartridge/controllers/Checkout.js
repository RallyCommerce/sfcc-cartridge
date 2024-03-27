'use strict';

var server = require('server');
server.extend(module.superModule);

server.prepend('Begin', function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var cookies = request.getHttpCookies();
    var rallyOrderInitiated = null;
    var rallyOrderInitiatedCookie = null;
    for (var i = 0; i < cookies.getCookieCount(); i++) {
        if (cookies[i] && cookies[i].name == 'rallyOrderInitiated') {
            rallyOrderInitiated = cookies[i].value;
            rallyOrderInitiatedCookie = cookies[i];
        }
    }
    var orderID = request.session.custom.tempOrderID || null;
    var orderToken = request.session.custom.tempOrderToken || null;

    if (orderID && orderToken && rallyOrderInitiated) {
        rallyOrderInitiatedCookie.setMaxAge(0);
        response.addHttpCookie(rallyOrderInitiatedCookie);
        request.session.custom.tempOrderID = null;
        request.session.custom.tempOrderToken = null;
        var confirmationUrl = URLUtils.abs('Order-Confirm');
        var resWriter = response.getWriter();
        var formContent = '<form method="POST" action="$confirmUrl" style="display: none;"><input name="orderID" type="hidden" value="$orderId"/><input name="orderToken" type="hidden" value="$orderToken"/></form><script>window.onload = function(){ document.forms[0].submit();}</script>';
        var velocity = require('dw/template/Velocity');
        velocity.render(formContent, { orderId: orderID, orderToken: orderToken, confirmUrl: confirmationUrl}, resWriter);

        return;
    } else {
        return next();
    }
});

server.append('Begin', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();

    if (currentBasket) {
        // Set custom attribute to the basket
        Transaction.wrap(function () {
            currentBasket.custom.basketId = currentBasket.getUUID();
        });
    }
    return next();
});

module.exports = server.exports();
