'use strict';

var Status = require('dw/system/Status');

function prepareCategoriesMap(product) {
    var categoriesArrray = [];
    var categoryAssignments = product.getCategoryAssignments().iterator();

    while (categoryAssignments.hasNext()) {
        var categoryAssignment = categoryAssignments.next();
        categoriesArrray.push(
            {
                categoryId: categoryAssignment.category.getID(),
                name: categoryAssignment.category.getDisplayName()
            }
        );
    }

    return categoriesArrray;
}

// eslint-disable-next-line no-unused-vars
exports.modifyGETResponse = function (product, doc) {
    if (product.isMaster()) {
        doc.c_categories = prepareCategoriesMap(product);
    }

    return new Status(Status.OK);
};
