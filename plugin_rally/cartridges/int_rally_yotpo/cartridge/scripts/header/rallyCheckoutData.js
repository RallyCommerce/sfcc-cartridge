'use strict';

/**
 * Renders rally scripts inline using Velocity
 */
function htmlHead() {
    var YotpoConfigurationModel = require('*/cartridge/models/common/yotpoConfigurationModel');
    var isCartridgeEnabled = YotpoConfigurationModel.isCartridgeEnabled();
    if (isCartridgeEnabled) {
        var velocity = require('dw/template/Velocity');
        velocity.render('$velocity.remoteInclude(\'RallyYotpo-HtmlHead\')', { velocity: velocity });
    }
}

module.exports = {
    htmlHead: htmlHead
};
