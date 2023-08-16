'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Order = require('dw/order/Order');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('rally.orders.status');
var Status = require('dw/system/Status');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');

function callOrderStatus(ordersArray) {
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'orders-update',
        reqBody: {
            orders: ordersArray
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

// eslint-disable-next-line no-unused-vars
var execute = function (args) {
    var customPreferences = Site.getCurrent().getPreferences();
    var rallyLastUpdated = customPreferences.custom.rallyOrderStatusDate;
    var orderStatusMap = {
        0: 'created',
        3: 'new',
        4: 'open',
        5: 'completed',
        6: 'cancelled'
    };
    var shippingStatusMap = {
        0: 'not_shipped',
        1: 'part_shipped',
        2: 'shipped'
    };
    if (empty(rallyLastUpdated)) {
        rallyLastUpdated = new Date('2023/01/01');
    }
    var newRunDate = new Date();
    var ordersArray = [];

    try {
        var querySQL = 'status != {0} AND lastModified > {1}';
        var ordersForExport = OrderMgr.queryOrders(querySQL, 'orderNo asc', Order.ORDER_STATUS_CREATED, rallyLastUpdated);

        while (ordersForExport.hasNext()) {
            var order = ordersForExport.next();
            if (order.custom.statusSentToRally.value !== order.getStatus().getValue()) {
                var orderObject = {
                    orderId: order.getCurrentOrderNo(),
                    orderStatus: orderStatusMap[order.getStatus().getValue()]
                };
                ordersArray.push(orderObject);
                // eslint-disable-next-line no-loop-func
                Transaction.wrap(function () {
                    order.custom.statusSentToRally = order.getStatus().getValue();
                });
            }
            if (order.custom.lastShipStatusSentToRally.value !== order.getShippingStatus().getValue()) {
                // eslint-disable-next-line no-loop-func
                var matchingOrder = ordersArray.find(function (item) {
                    return item.orderId === order.getCurrentOrderNo();
                });
                if (matchingOrder) {
                    matchingOrder.shippingStatus = shippingStatusMap[order.getShippingStatus().getValue()];
                } else {
                    var shippingOrderObject = {
                        orderId: order.getCurrentOrderNo(),
                        shippingStatus: shippingStatusMap[order.getShippingStatus().getValue()]
                    };
                    ordersArray.push(shippingOrderObject);
                }
                // eslint-disable-next-line no-loop-func
                Transaction.wrap(function () {
                    order.custom.lastShipStatusSentToRally = order.getShippingStatus().getValue();
                });
            }
        }
        if (!empty(ordersArray)) {
            var result = [];
            var chunkSize = 50;

            for (var i = 0; i < ordersArray.length; i += chunkSize) {
                var chunk = ordersArray.slice(i, i + chunkSize);
                var chunkResult = callOrderStatus(chunk);
                result.push(chunkResult);
            }

            var callsResult = result.every(function (cr) {
                return cr.ok === true;
            });

            if (callsResult) {
                Transaction.wrap(function () {
                    customPreferences.custom.rallyOrderStatusDate = newRunDate;
                });
                return new Status(Status.OK, 'OK');
            }

            Logger.error('orderStatusNotifications.js : Error while calling service OSU: ' + result.error);
            return new Status(Status.ERROR, 'ERROR', result.error);
        }
        return new Status(Status.OK, 'OK');
    } catch (e) {
        Logger.error('orderStatusNotifications.js : Error while checking order statuses: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
};

exports.execute = execute;
