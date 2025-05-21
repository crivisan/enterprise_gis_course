'use strict';

const map = $('#map').data('map'); // Retrieve map instance
const mapLayers = map.getLayers()

export function getLayerByName(layerName) {
    let layer = null;

    mapLayers.forEach(lyr => {
        if (lyr.get('name') === layerName)
            layer = lyr;
    });
    return layer
}