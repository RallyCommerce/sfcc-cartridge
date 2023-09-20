'use strict';

var Status = require('dw/system/Status');
var Calendar = require('dw/util/Calendar');
var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

// eslint-disable-next-line no-unused-vars
var sessionsCleanup = function (args) {
    var dateCalendar = new Calendar();
    dateCalendar.add(Calendar.DAY_OF_MONTH, -1);
    var expiredBasketSessions = CustomObjectMgr.queryCustomObjects('RallySessionBasket', 'lastModified < {0}', 'lastModified DESC', dateCalendar.getTime());
    while (expiredBasketSessions.hasNext()) {
        var rallyBasketSessionObject = expiredBasketSessions.next();
        Transaction.wrap(function () {
            CustomObjectMgr.remove(rallyBasketSessionObject);
        });
    }

    return new Status(Status.OK, 'OK');
};

exports.sessionsCleanup = sessionsCleanup;
