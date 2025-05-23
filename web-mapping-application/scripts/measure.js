'use strict';

import Map from 'ol/Map.js';
import { unByKey } from 'ol/Observable.js';
import Overlay from 'ol/Overlay.js';
import View from 'ol/View.js';
import LineString from 'ol/geom/LineString.js';
import Polygon from 'ol/geom/Polygon.js';
import Draw from 'ol/interaction/Draw.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { getArea, getLength } from 'ol/sphere.js';
import CircleStyle from 'ol/style/Circle.js';
import Fill from 'ol/style/Fill.js';
import Stroke from 'ol/style/Stroke.js';
import Style from 'ol/style/Style.js';

const map = $('#map').data('map');


const source = new VectorSource();

const vector = new VectorLayer({
    source: source,
    style: {
        'fill-color': 'rgba(255, 255, 255, 0.2)',
        'stroke-color': '#ffcc33',
        'stroke-width': 2,
        'circle-radius': 7,
        'circle-fill-color': '#ffcc33',
    },
});

//add an unclick function
$('#measure').click(function () {
    $('#draggable-title').html('Measure');
    $('#draggable-content').html(`
        <form>
        <label for="type">Measurement type &nbsp;</label>
        <select id="type">
            <option value="length">Length (LineString)</option>
            <option value="area">Area (Polygon)</option>
        </select>
        </form>
        `);
    $('#draggable').css('display', 'block');

    Measure();
});

$('#draggable-closer').click(function () {
    $('#draggable').css('display', 'none');
    $('#draggable-title').html('None');
    $('.ol-tooltip').remove();
    vector.getSource().clear(true);
    map.removeLayer(vector);
    map.getInteractions().pop();
}
);


//add click function to run when clicking on measure button
function Measure() {

    /**
     * Currently drawn feature.
     * @type {import('ol/Feature.js').default}
     */
    let sketch;

    /**
     * The help tooltip element.
     * @type {HTMLElement}
     */
    let helpTooltipElement;

    /**
     * Overlay to show the help messages.
     * @type {Overlay}
     */
    let helpTooltip;

    /**
     * The measure tooltip element.
     * @type {HTMLElement}
     */
    let measureTooltipElement;

    /**
     * Overlay to show the measurement.
     * @type {Overlay}
     */
    let measureTooltip;

    /**
     * Message to show when the user is drawing a polygon.
     * @type {string}
     */
    const continuePolygonMsg = 'Click to continue drawing the polygon';

    /**
     * Message to show when the user is drawing a line.
     * @type {string}
     */
    const continueLineMsg = 'Click to continue drawing the line';

    /**
     * Handle pointer move.
     * @param {import('../src/ol/MapBrowserEvent').default} evt The event.
     */
    const pointerMoveHandler = function (evt) {
        if (evt.dragging) {
            return;
        }

        let helpMsg = 'Click to start drawing';

        if (sketch) {
            const geom = sketch.getGeometry();
            if (geom instanceof Polygon) {
                helpMsg = continuePolygonMsg;
            } else if (geom instanceof LineString) {
                helpMsg = continueLineMsg;
            }
        }

        helpTooltipElement.innerHTML = helpMsg;
        helpTooltip.setPosition(evt.coordinate);

        helpTooltipElement.classList.remove('hidden');
    };

    //delete map provided by example and define our own map
    map.addLayer(vector);



    map.on('pointermove', pointerMoveHandler);

    map.getViewport().addEventListener('mouseout', function () {
        helpTooltipElement.classList.add('hidden');
    });

    const typeSelect = document.getElementById('type');

    let draw; // global so we can remove it later

    /**
     * Format length output.
     * @param {LineString} line The line.
     * @return {string} The formatted length.
     */
    const formatLength = function (line) {
        const length = getLength(line);
        let output;
        if (length > 100) {
            output = Math.round((length / 1000) * 100) / 100 + ' ' + 'km';
        } else {
            output = Math.round(length * 100) / 100 + ' ' + 'm';
        }
        return output;
    };

    /**
     * Format area output.
     * @param {Polygon} polygon The polygon.
     * @return {string} Formatted area.
     */
    const formatArea = function (polygon) {
        const area = getArea(polygon);
        let output;
        if (area > 10000) {
            output = Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
        } else {
            output = Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
        }
        return output;
    };

    const style = new Style({
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.2)',
        }),
        stroke: new Stroke({
            color: 'rgba(243, 19, 19, 0.5)',
            //lineDash: [10, 10],
            width: 2,
        }),
        image: new CircleStyle({
            radius: 5,
            stroke: new Stroke({
                color: 'rgba(0, 0, 0, 0.7)',
            }),
            fill: new Fill({
                color: 'rgba(255, 255, 255, 0.2)',
            }),
        }),
    });

    function addInteraction() {
        const type = typeSelect.value == 'area' ? 'Polygon' : 'LineString';
        draw = new Draw({
            source: source,
            type: type,
            style: function (feature) {
                const geometryType = feature.getGeometry().getType();
                if (geometryType === type || geometryType === 'Point') {
                    return style;
                }
            },
        });
        map.addInteraction(draw);

        createMeasureTooltip();
        createHelpTooltip();

        let listener;
        draw.on('drawstart', function (evt) {
            // set sketch
            sketch = evt.feature;

            let tooltipCoord;

            listener = sketch.getGeometry().on('change', function (evt) {
                const geom = evt.target;
                let output;
                if (geom instanceof Polygon) {
                    output = formatArea(geom);
                    tooltipCoord = geom.getInteriorPoint().getCoordinates();
                } else if (geom instanceof LineString) {
                    output = formatLength(geom);
                    tooltipCoord = geom.getLastCoordinate();
                }
                measureTooltipElement.innerHTML = output;
                measureTooltip.setPosition(tooltipCoord);
            });
        });

        draw.on('drawend', function () {
            measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
            measureTooltip.setOffset([0, -7]);
            // unset sketch
            sketch = null;
            // unset tooltip so that a new one can be created
            measureTooltipElement = null;
            createMeasureTooltip();
            unByKey(listener);
        });
    }

    /**
     * Creates a new help tooltip
     */
    function createHelpTooltip() {
        if (helpTooltipElement) {
            helpTooltipElement.remove();
        }
        helpTooltipElement = document.createElement('div');
        helpTooltipElement.className = 'ol-tooltip hidden';
        helpTooltip = new Overlay({
            element: helpTooltipElement,
            offset: [15, 0],
            positioning: 'center-left',
        });
        map.addOverlay(helpTooltip);
    }

    /**
     * Creates a new measure tooltip
     */
    function createMeasureTooltip() {
        if (measureTooltipElement) {
            measureTooltipElement.remove();
        }
        measureTooltipElement = document.createElement('div');
        measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
        measureTooltip = new Overlay({
            element: measureTooltipElement,
            offset: [0, -15],
            positioning: 'bottom-center',
            stopEvent: false,
            insertFirst: false,
        });
        map.addOverlay(measureTooltip);
    }

    /**
     * Let user change the geometry type.
     */
    typeSelect.onchange = function () {
        map.removeInteraction(draw);
        addInteraction();
    };

    addInteraction();

};


