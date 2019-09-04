import React from 'react';
const L = require('leaflet');

class SimpleExample extends React.Component {
    constructor() {
        super()
        this.state = {
            lat: 0,
            lng: 0,
            zoom: 1,
            scale: 1,
        };

        this.renderedTiles = [];
    };

    addTile(map, x, y, url) {
        const lat = this.state.scale * x;
        const lng = this.state.scale * y;
        this.renderedTiles.push({ x, y, data: L.imageOverlay(url, [[lat, lng], [lat + this.state.scale, lng + this.state.scale]]).addTo(map) });
    };

    removeTile(x, y) {
        const tile = this.renderedTiles.filter(t => {
            if (t.x === x) {
                if (t.y === y) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }
        })
        if (!tile[0]) return;
        
        tile[0].data.remove();
    };

    componentDidMount() {
        const map = L.map('map-container', {
            preferCanvas: true,
            attributionControl: false,
            crs: L.extend({}, L.CRS, {
                code: 'simple',
                projection: {
                    project: (latlng) => {
                        return new L.Point(latlng.lat, latlng.lng);
                    },
                    unproject: (point) => {
                        return new L.LatLng(point.x, point.y);
                    }
                },
                transformation: new L.Transformation(1, 0, 1, 0),
                scale: (zoom) => {
                    return (1 << zoom);
                }
            }),
            continuousWorld: true,
            worldCopyJump: false
        }).setView([this.state.lat, this.state.lng], this.state.zoom);
        const imageUrl = '/minecraft/assets/minecraft/textures/block/dark_oak_log_top.png';

        //this is for testing

        for (var i = 0; i < 10; i++) {
            for (var j = 0; j < 10; j++) {
                this.addTile(map, j, i, imageUrl);
            };
        };
    };

    render() {
        return (
            <div id="map-container" style={{ width: "100%", height: "98vh" }}></div>
        );
    }
}


export default SimpleExample;