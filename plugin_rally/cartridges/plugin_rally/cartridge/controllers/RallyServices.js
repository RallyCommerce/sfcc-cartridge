'use strict';

var server = require('server');

server.post('CalculateTax', function (req, res, next) {
    var rallyHelper = require('*/cartridge/scripts/util/rallyHelper');
    if (rallyHelper.isAuthenticated(req)) {
        var requestBody = JSON.parse(req.body);
    
        var updateResult = rallyHelper.calculateTaxes(requestBody);
        res.json(updateResult);
    } else {
        res.json({
            success: false,
            error: "Not Authenticated"
        });
    }
    return next();
});

module.exports = server.exports();