'use strict';
//import Map from 'ol/Map.js';
// remove above and import the connection to our const map

import Overlay from 'ol/Overlay.js';
import { toStringHDMS } from 'ol/coordinate.js';
import { toLonLat } from 'ol/proj.js';
import { getLayerByName } from './cunstomFunctions';

//creating the conector to const map from map_w_own_layers.js
const map = $('#map').data('map') // Retrieve map instance


/**
 * Elements that make up the popup.
 */
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
const closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
const overlay = new Overlay({
    element: container,
    autoPan: {
        animation: {
            duration: 250,
        },
    },
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};


/**
 * Create the map.
 */
map.addOverlay(overlay);


/**
 * Add a click handler to the map to render the popup.
 */
map.on('singleclick', function (evt) {
    if ($('#draggable-title').text() !== "Measure") {
        const coordinate = evt.coordinate;
        const hdms = toStringHDMS(toLonLat(coordinate));

        // Get the layer by its name
        const parcelsLayer = getLayerByName('Parcels');
        const parcelsSource = parcelsLayer.getSource();

        const buildingsLayer = getLayerByName('Buildings');
        const buildingsSource = buildingsLayer.getSource();

        const view = map.getView();
        const resolution = view.getResolution();
        const projection = view.getProjection();

        //To fix issue of clicking on no-features in the map 
        const parcelInfo = $('#parcel-info');
        parcelInfo.html('');
        const buildingInfo = $('#building-info');
        buildingInfo.html('')
        const noFeatures = $('#no-features');
        noFeatures.html('<p>No Features</p>')

        // get url to request information from Geoserver to our App
        const parcelUrl = parcelsSource.getFeatureInfoUrl(coordinate, resolution, projection,
            { 'INFO_FORMAT': 'application/json' }
        );

        if (parcelUrl) {
            $.ajax({
                url: parcelUrl,
                method: 'GET',
                success: function (result) {
                    const parcel = result.features[0];
                    if (parcel) {
                        const parcelNumber = parcel.properties.parcel_n;
                        const blockNumber = parcel.properties.block_n;
                        const parcelArea = parcel.properties.shape_area;

                        //create a html markdown, to feed div of parcel and building info
                        // declared at the beginning so it pops a empty message if not found
                        //const parcelInfo = $('#parcel-info');
                        parcelInfo.html(`<h5>Parcel Info</h5> 
                    <p>Parcel Number: ${parcelNumber}</p>
                    <p>Block Number: ${blockNumber}</p>
                    <p>Area (sqm): ${parcelArea.toFixed(2)}</p>`
                        );
                        noFeatures.html('');
                    }
                }
            })
        }

        const buildingUrl = buildingsSource.getFeatureInfoUrl(coordinate, resolution, projection,
            { 'INFO_FORMAT': 'application/json' }
        );

        if (buildingUrl) {
            $.ajax({
                url: buildingUrl,
                method: 'GET',
                success: function (result) {
                    const building = result.features[0];
                    if (building) {
                        const buildingNumber = building.properties.building_n;
                        const buildingArea = building.properties.shape_area;

                        //create a html markdown, to feed div of building and building info
                        // declared at the beginning so it pops a empty message if not found
                        // const buildingInfo = $('#building-info');

                        buildingInfo.html(`<h5>Building Info</h5> 
                    <p>Building Number: ${buildingNumber}</p>
                    <p>Area (sqm): ${buildingArea.toFixed(2)}</p>`
                        );
                        noFeatures.html('');
                    }
                }
            })
        }

        // remove this //content.innerHTML = '<p>You clicked here:</p><code>' + hdms + '</code>';
        overlay.setPosition(coordinate);
    }

});
