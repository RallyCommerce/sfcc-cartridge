'use strict';

var Site = require('dw/system/Site');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger').getLogger('rally.site.updates');
var RallyServiceHelper = require('*/cartridge/scripts/service/rallyServiceInit.js');

function prepareRequest(rallyConfig) {
    var rallyRequest = {};
    rallyRequest.defaultLocale = rallyConfig.custom.defaultLocale;
    rallyRequest.defaultCurrency = rallyConfig.custom.defaultCurrency;
    rallyRequest.shippingZones = rallyConfig.custom.shippingZones;
    rallyRequest.allowedCurrencies = rallyConfig.custom.allowedCurrencies.split(',');
    rallyRequest.allowedLocales = rallyConfig.custom.allowedLocales.split(',');

    return rallyRequest;
}

function objectsEqual(storeData, customConfig) {
    return JSON.stringify(storeData) === JSON.stringify(customConfig);
}

function updateCustomObject(customObject, currentConfig) {
    customObject.custom.defaultLocale = currentConfig.defaultLocale;
    customObject.custom.defaultCurrency = currentConfig.defaultCurrency;
    customObject.custom.shippingZones = currentConfig.shippingZones;
    customObject.custom.allowedCurrencies = currentConfig.allowedCurrencies.toString();
    customObject.custom.allowedLocales = currentConfig.allowedLocales.toString();

    return customObject;
}

// eslint-disable-next-line no-unused-vars
var siteUpdates = function (args) {
    var rallyConfig = CustomObjectMgr.getCustomObject('RallyStoreInformation', Site.getCurrent().getID()); // Getting config or null
    var isFirstRun = false;

    var shippingZones = Site.getCurrent().getCustomPreferenceValue('rallyShippingCountriesConfig');

    var currentConfig = {
        defaultLocale: Site.getCurrent().getDefaultLocale(),
        defaultCurrency: Site.getCurrent().getDefaultCurrency(),
        shippingZones: shippingZones,
        allowedCurrencies: Site.getCurrent().getAllowedCurrencies().toArray(),
        allowedLocales: Site.getCurrent().getAllowedLocales().toArray()
    };
    if (rallyConfig === null) { // If no configuration exists - creating it
        isFirstRun = true;
        Transaction.wrap(function () {
            rallyConfig = CustomObjectMgr.createCustomObject('RallyStoreInformation', Site.getCurrent().getID());
            rallyConfig = updateCustomObject(rallyConfig, currentConfig);
        });
    }

    var rallyRequest = prepareRequest(rallyConfig);
    var objectsAreEqual = objectsEqual(rallyRequest, currentConfig);

    if (!objectsAreEqual || isFirstRun) {
        var currentService = 'rally.status_update';
        var rallyService = RallyServiceHelper.rallyService(currentService);
        var params = {
            action: 'store-update',
            reqBody: rallyRequest,
            reqMethod: 'POST'
        };

        var result = rallyService.call(params);
        if (result.ok) {
            Transaction.wrap(function () {
                updateCustomObject(rallyConfig, currentConfig);
            });
            return new Status(Status.OK, 'OK');
        }

        Logger.error('checkStockLevels.js : Error while calling service Stock Status Update: ' + result.error);
        return new Status(Status.ERROR, 'ERROR', result.error);
    }
    return new Status(Status.OK, 'OK');
};
exports.siteUpdates = siteUpdates;
