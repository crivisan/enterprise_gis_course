import 'ol/ol.css';
import { Map, View } from 'ol/';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';

const osmLayer = new TileLayer(
    {
        source: new OSM()
    }
);

const view = new View(
    {
        center: [0, 0],
        zoom: 0
    }
);

const map = new Map(
    {
        target: "map",
        layers: [osmLayer],
        view: view
    }
);