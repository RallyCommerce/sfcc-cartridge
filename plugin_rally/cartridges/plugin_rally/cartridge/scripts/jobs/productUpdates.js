'use strict';

var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var Status = require('dw/system/Status');
var collections = require('*/cartridge/scripts/util/collections');
var Transaction = require('dw/system/Transaction');
var StringUtils = require('dw/util/StringUtils');
var Logger = require('dw/system/Logger').getLogger('rally.products.updates');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');
var atributesList = ['name', 'longDescription', 'manufacturerName', 'shortDescription'];

function createProductPayload(product) {
    var productToUpdate = {};
    if (product.isVariant()) {
        productToUpdate.externalProductId = product.getMasterProduct().getID();
        productToUpdate.externalVariantId = product.getID();
    } else {
        productToUpdate.externalProductId = product.getID();
        productToUpdate.externalVariantId = null;
    }

    return productToUpdate;
}

function createAttributesHash(product) {
    var stringForHash = '';
    var MessageDigest = require('dw/crypto/MessageDigest');
    var Bytes = require('dw/util/Bytes');
    for (var i = 0; atributesList.length < i; i++) {
        var attrName = atributesList[i];
        stringForHash += StringUtils.encodeBase64(product[attrName]);
    }
    if (product.isVariant()) {
        stringForHash += StringUtils.encodeBase64(product.getPriceModel().getPrice().getValue());
    }
    if (product.getImage('large')) {
        stringForHash += StringUtils.encodeBase64(product.getImage('large').getAbsURL().toString());
    }

    if (product.isMaster()) {
        var categoriesArray = product.getCategories().toArray();
        var categories = categoriesArray.map(function (category) {
            return category.ID;
        });
        stringForHash += categories.toString();
    }
    var md = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    var bytesHash = new Bytes(stringForHash);
    var hashedString = md.digestBytes(bytesHash);

    return StringUtils.encodeBase64(hashedString.toString());
}

function isUpdated(product, hashedAttributes) {
    return product.custom.rallyHashedAttributes && product.custom.rallyHashedAttributes !== hashedAttributes;
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

function callProductService(productsArray) {
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'products-update',
        reqBody: {
            products: productsArray
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

// eslint-disable-next-line no-unused-vars
var productUpdates = function (args) {
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
                var masterProductHA = createAttributesHash(product);
                if (empty(product.custom.rallyHashedAttributes) || isUpdated(product, masterProductHA)) {
                    productsArray.push(createProductPayload(product));
                    // eslint-disable-next-line no-loop-func
                    Transaction.wrap(function () {
                        product.custom.rallyHashedAttributes = masterProductHA;
                    });
                }
                // eslint-disable-next-line no-loop-func
                collections.forEach(product.getVariationModel().getVariants(), function (variant) {
                    var hashedAttributes = createAttributesHash(variant);
                    if (empty(variant.custom.rallyHashedAttributes) || isUpdated(variant, hashedAttributes)) {
                        productsArray.push(createProductPayload(variant));
                        // eslint-disable-next-line no-loop-func
                        Transaction.wrap(function () {
                            variant.custom.rallyHashedAttributes = hashedAttributes;
                        });
                    }
                });
            } else {
                var hashedAttributes = createAttributesHash(product);
                if (empty(product.custom.rallyHashedAttributes) || isUpdated(product, hashedAttributes)) {
                    productsArray.push(createProductPayload(product));
                    // eslint-disable-next-line no-loop-func
                    Transaction.wrap(function () {
                        product.custom.rallyHashedAttributes = hashedAttributes;
                    });
                }
            }
        }

        if (!empty(productsArray)) {
            productsArray = removeDuplicates(productsArray);
            var result = [];
            var chunkSize = 50;

            for (var i = 0; i < productsArray.length; i += chunkSize) {
                var chunk = productsArray.slice(i, i + chunkSize);
                var chunkResult = callProductService(chunk);
                result.push(chunkResult);
            }

            var callsResult = result.every(function (cr) {
                return cr.ok === true;
            });
            if (callsResult) {
                return new Status(Status.OK, 'OK');
            }

            Logger.error('productUpdates.js : Error while calling service Products Update: ' + result.error);
            return new Status(Status.ERROR, 'ERROR', result.error);
        }

        return new Status(Status.OK, 'OK');
    } catch (e) {
        Logger.error('productUpdates.js : Error while checking products: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
};

exports.productUpdates = productUpdates;
