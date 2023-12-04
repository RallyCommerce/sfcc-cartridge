'use strict';

var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Status = require('dw/system/Status');
var collections = require('*/cartridge/scripts/util/collections');
var Site = require('dw/system/Site');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('rally.products.inventory');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');

function createProductStockLine(productId, inventoryRecord, masterProductId) {
    var inventoryObject = {};
    if (masterProductId) {
        inventoryObject.externalProductId = masterProductId;
        inventoryObject.externalVariantId = productId;
    } else {
        inventoryObject.externalProductId = productId;
        inventoryObject.externalVariantId = null;
    }

    inventoryObject.allocation = inventoryRecord.getAllocation().getValue();
    inventoryObject.quantity = inventoryRecord.getStockLevel().getValue();

    return inventoryObject;
}

function checkForDuplicates(productsArray, productId) {
    var isDuplicated = productsArray.some(function (item) {
        return item.externalProductId === productId;
    });

    return isDuplicated;
}

function callStockService(productsArray) {
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'products-inventory-update',
        reqBody: {
            products: productsArray
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

// eslint-disable-next-line no-unused-vars
var checkLevels = function (args) {
    var customPreferences = Site.getCurrent().getPreferences();
    var lastUpdateTime = customPreferences.custom.rallyStockDate;
    if (empty(lastUpdateTime)) {
        lastUpdateTime = new Date('2023/01/01');
    }
    var newRunDate = new Date();
    var productsArray = [];
    try {
        var psm = new ProductSearchModel();
        psm.setCategoryID('root');
        psm.setOrderableProductsOnly(false);
        psm.search();

        var productSearchHits = psm.getProductSearchHits();
        while (productSearchHits.hasNext()) {
            var product = productSearchHits.next().getProduct();
            if (product.isMaster()) {
                collections.forEach(product.getVariationModel().getVariants(), function (variant) {
                    var pam = variant.getAvailabilityModel();
                    var inventoryRecord = pam.getInventoryRecord();
                    if (inventoryRecord && inventoryRecord.getLastModified() > lastUpdateTime) {
                        productsArray.push(createProductStockLine(variant.getID(), inventoryRecord, variant.getMasterProduct().getID()));
                    }
                });
            } else {
                var pam = product.getAvailabilityModel();
                var inventoryRecord = pam.getInventoryRecord();
                if (inventoryRecord && inventoryRecord.getLastModified() > lastUpdateTime && !checkForDuplicates(productsArray, product.getID())) {
                    var masterProductId = product.isVariant() ? product.getMasterProduct().getID() : null;
                    productsArray.push(createProductStockLine(product.getID(), inventoryRecord, masterProductId));
                }
            }
        }

        if (!empty(productsArray)) {
            var result = [];
            var chunkSize = 50;

            for (var i = 0; i < productsArray.length; i += chunkSize) {
                var chunk = productsArray.slice(i, i + chunkSize);
                var chunkResult = callStockService(chunk);
                result.push(chunkResult);
            }

            var callsResult = result.every(function (cr) {
                return cr.ok === true;
            });
            if (callsResult) {
                Transaction.wrap(function () {
                    customPreferences.custom.rallyStockDate = newRunDate;
                });
                return new Status(Status.OK, 'OK');
            }

            Logger.error('checkStockLevels.js : Error while calling service Stock Status Update: ' + result[result.length - 1].error);
            return new Status(Status.ERROR, 'ERROR', result[result.length - 1].error);
        }

        return new Status(Status.OK, 'OK');
    } catch (e) {
        Logger.error('chekStockLevels.js : Error while checking stock levels: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
};

exports.checkLevels = checkLevels;
