'use strict';

var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var ProductMgr = require('dw/catalog/ProductMgr');
var Logger = require('dw/system/Logger').getLogger('rally.products.delete');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');

function createProductPayload(deletedArray) {
    var payload = [];
    deletedArray.forEach(function (variantId) {
        if (!ProductMgr.getProduct(variantId)) {
            var productToDelete = {};
            productToDelete.externalProductId = variantId;
            payload.push(productToDelete);
        }
    });

    return payload;
}

function isUpdated(product, rallyVariations) {
    return product.custom.rallyVariationIds && product.custom.rallyVariationIds.split(',') !== rallyVariations;
}

function removeDuplicates(inputArray) {
    var outputArray = [];
    inputArray.forEach(function (element) {
        if (!outputArray.includes(element)) {
            outputArray.push(element);
        }
    });
    return outputArray;
}

function getSortedVariationIDs(product) {
    var variationsCollection = product.getVariants();
    var variationsArray = variationsCollection.toArray().map(function (variant) {
        return variant.ID;
    });
    variationsArray.sort();

    return variationsArray;
}

function callDeletedService(productsArray) {
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'products-delete',
        reqBody: {
            products: productsArray
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

// eslint-disable-next-line no-unused-vars
var productDeleted = function (args) {
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
                var rallyVariations = getSortedVariationIDs(product);
                if (isUpdated(product, rallyVariations)) {
                    if (!empty(product.custom.rallyVariationIds)) {
                        var deletedVariants = product.custom.rallyVariationIds.split(',').filter(function (el) {
                            return rallyVariations.indexOf(el) < 0;
                        });
                        if (deletedVariants.length > 0) {
                            productsArray = productsArray.concat(createProductPayload(deletedVariants));
                        }
                    }
                }
                // eslint-disable-next-line no-loop-func
                Transaction.wrap(function () {
                    product.custom.rallyVariationIds = rallyVariations.toString();
                });
            }
        }

        if (!empty(productsArray)) {
            productsArray = removeDuplicates(productsArray);
            var result = [];
            var chunkSize = 50;

            for (var i = 0; i < productsArray.length; i += chunkSize) {
                var chunk = productsArray.slice(i, i + chunkSize);
                var chunkResult = callDeletedService(chunk);
                result.push(chunkResult);
            }

            var callsResult = result.every(function (cr) {
                return cr.ok === true;
            });
            if (callsResult) {
                return new Status(Status.OK, 'OK');
            }

            Logger.error('productDeleted.js : Error while calling service Products Delete: ' + result.error);
            return new Status(Status.ERROR, 'ERROR', result.error);
        }

        return new Status(Status.OK, 'OK');
    } catch (e) {
        Logger.error('productDeleted.js : Error while checking products: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
};

exports.productDeleted = productDeleted;
