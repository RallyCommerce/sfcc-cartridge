'use strict';

var server = require('server');
server.extend(module.superModule);

server.append('PlaceOrder', function (req, res, next) {
    var viewData = res.getViewData();

    if (viewData.orderID) {
        var orderNo = viewData.orderID;
        var orderToken = viewData.orderToken;
        var OrderMgr = require('dw/order/OrderMgr');
        var order = OrderMgr.getOrder(orderNo);
        session.custom.tempOrderID = orderNo;
        session.custom.tempOrderToken = orderToken;
        try {
            var rallyHelper = require('*/cartridge/scripts/util/rallyHelper');
            rallyHelper.callCreateOrderHook(orderNo);
        } catch (ex) {
            // Errors captured in services helper
        }
    }

    return next();
});

module.exports = server.exports();
