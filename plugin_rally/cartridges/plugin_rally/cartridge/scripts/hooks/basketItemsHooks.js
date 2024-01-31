'use strict';

var Status = require('dw/system/Status');

// eslint-disable-next-line no-unused-vars
exports.afterPOST = function (basket, items) {
    for (var i = 0; items.length > i; i++) {
        var itemToAdd = items[i];
        if (itemToAdd.productId === 'changeup-donation') {
            var pli = {};
            if (basket.getProductLineItems('changeup-donation').length > 0) {
                pli = basket.getProductLineItems('changeup-donation')[0];
            }
            pli.setPriceValue(parseFloat(itemToAdd.price));
            pli.setQuantityValue(1); // always set qty to 1 for changeup-donation
            var HookMgr = require('dw/system/HookMgr');
            HookMgr.callHook('dw.order.calculate', 'calculate', basket);
        }
    }
};
