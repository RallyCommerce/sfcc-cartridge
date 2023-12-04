'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var customPreferences = Site.getCurrent().getPreferences();
var Logger = require('dw/system/Logger').getLogger('rally.categories.updates');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');
var categoriesArray = [];

function callCategoryService(categories) {
    var currentService = 'rally.status_update';
    var rallyService = RallyServiceHelper.rallyService(currentService);
    var params = {
        action: 'category-update',
        reqBody: {
            categories: categories
        },
        reqMethod: 'POST'
    };

    return rallyService.call(params);
}

function getUpdatedCategory(category, date) {
    if (category.getLastModified() >= date) {
        categoriesArray.push({
            title: category.displayName,
            external_id: category.ID
        });
    }
    var subCats = category.getSubCategories();
    if (subCats.length > 0) {
        var subCatsIterator = subCats.iterator();
        while (subCatsIterator.hasNext()) {
            var subCategory = subCatsIterator.next();
            getUpdatedCategory(subCategory, date);
        }
    }
    return categoriesArray;
}

// eslint-disable-next-line no-unused-vars
var categoryUpdates = function (args) {
    var rallyLastUpdated = customPreferences.custom.rallyCategoryDate;
    if (empty(rallyLastUpdated)) {
        rallyLastUpdated = new Date('2023/10/01');
    }
    var newRunDate = new Date();
    try {
        var siteCatalog = CatalogMgr.getSiteCatalog();
        var rootCategory = siteCatalog.getRoot();
        getUpdatedCategory(rootCategory, rallyLastUpdated);

        if (!empty(categoriesArray)) {
            var result = [];
            var chunkSize = 50;

            for (var i = 0; i < categoriesArray.length; i += chunkSize) {
                var chunk = categoriesArray.slice(i, i + chunkSize);
                var chunkResult = callCategoryService(chunk);
                result.push(chunkResult);
            }

            var callsResult = result.every(function (cr) {
                return cr.ok === true;
            });
            if (callsResult) {
                Transaction.wrap(function () {
                    customPreferences.custom.rallyCategoryDate = newRunDate;
                });
                return new Status(Status.OK, 'OK');
            }

            Logger.error('categoryUpdates.js : Error while calling service Category Updates: ' + result[result.length - 1].error);
            return new Status(Status.ERROR, 'ERROR', result[result.length - 1].error);
        }

        return new Status(Status.OK, 'OK');
    } catch (e) {
        Logger.error('categoryUpdates.js : Error while checking categories: ' + e.message);
        return new Status(Status.ERROR, 'ERROR', e.message);
    }
};

exports.categoryUpdates = categoryUpdates;
