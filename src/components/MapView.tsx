import 'maplibre-gl/dist/maplibre-gl.css';
import {Map} from "react-map-gl/maplibre";
import {type ReactNode, useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useParams} from "react-router";
import maplibregl from "maplibre-gl";
import {Button, Flex} from "@chakra-ui/react";

type FeatureProps = {
    properties: {
        type: string;
        value?: number;
        timestamp?: string;
        h2s_kg_h?: number;
    };
    geometry: any;
};

type ClickEvent = {
    lngLat: { lng: number; lat: number };
    features?: FeatureProps[];
};

export function MapView() {
    const [geojsonData, setGeojsonData] = useState("")
    const [geojsonLoaded, setGeojsonLoaded] = useState(false)
    const [geojsonLoadedFull, setGeojsonLoadedFull] = useState(false)
    const params = useParams()
    const layersAddedRef = useRef(false)

    const mapInstanceRef = useRef<any>(null)
    const mapRef = useRef<any>(null);

    const [timestamps, setTimestamps] = useState([] as ReactNode[])
    const navigate = useNavigate()

    const handleConcentrationClick = useCallback((event: ClickEvent) => {
        const {features, lngLat} = event;
        if (!features || features.length === 0) return;

        const feat = features[0];
        const {value, timestamp} = feat.properties;

        // Используем mapInstanceRef.current вместо mapRef.current
        if (mapInstanceRef.current) {
            new maplibregl.Popup()
                .setLngLat(lngLat)
                .setHTML(`<strong>Concentration</strong><br/>value: ${value || 0}<br/>timestamp: ${timestamp || 'N/A'}`)
                .addTo(mapInstanceRef.current);
        }
    }, []);

    const handleSourceClick = useCallback((event: ClickEvent) => {
        const {features, lngLat} = event;
        if (!features || features.length === 0) return;

        const feat = features[0];
        const {type, h2s_kg_h} = feat.properties;

        // Используем mapInstanceRef.current вместо mapRef.current
        if (mapInstanceRef.current) {
            new maplibregl.Popup()
                .setLngLat(lngLat)
                .setHTML(`<strong>Source</strong><br/>type: ${type}<br/>h2s: ${h2s_kg_h || 'N/A'}`)
                .addTo(mapInstanceRef.current);
        }
    }, []);

    useEffect(() => {
        if (!geojsonLoaded) {
            setGeojsonLoaded(true)
            fetch(`https://visback.fiwka.dev/available_timestamps?map_id=${params.mapId}`)
                .then(res => res.json())
                .then(res => setTimestamps(res.timestamps.map(x => {
                    return <Button key={x} onClick={() => {
                        navigate(`/map/${params.mapId}/${x}`)
                        navigate(0)
                    }}>{x}</Button>
                })))
            fetch(`https://visback.fiwka.dev/generate_geojson_timestamp?timestamp=${params.timestamp}&map_id=${params.mapId}`)
                .then(res => res.json())
                .then(res => {
                    setGeojsonData(res)
                    setGeojsonLoadedFull(true)
                })
        }
    }, [geojsonLoaded, setGeojsonData, setGeojsonLoaded, params, setGeojsonLoadedFull, navigate])

    const initializeLayers = useCallback((map) => {
        if (!geojsonData || layersAddedRef.current) return;

        mapInstanceRef.current = map

        // Добавляем источник
        if (map.getSource && map.getSource('concentration')) {
            map.getSource('concentration').setData(geojsonData);
        } else {
            map.addSource('concentration', {type: 'geojson', data: geojsonData});
        }

        // Слой для полигонов концентрации
        if (!map.getLayer('concentration-fills')) {
            map.addLayer({
                id: 'concentration-fills',
                type: 'fill',
                source: 'concentration',
                filter: ['==', ['get', 'type'], 'concentration_cell'],
                layout: {visibility: 'visible'},
                paint: {
                    // fill-color по значению
                    'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'value'],
                        0, '#ffffff',      // значение 0 — белый (вместо цвета используем прозрачность)
                        0.0000001, '#ffffcc',
                        1, '#ffeda0',
                        5, '#feb24c',
                        10, '#f03b20'
                    ],
                    // opacity: сделаем полностью прозрачными ячейки со значением 0
                    'fill-opacity': [
                        'case',
                        ['==', ['get', 'value'], 0],
                        0,
                        // иначе — интерполяция opacity по value (можно просто 0.6)
                        0.7
                    ],
                    'fill-outline-color': '#00000000'
                }
            });
        }

        // Слой для точечных источников
        if (!map.getLayer('point-sources')) {
            map.addLayer({
                id: 'point-sources',
                type: 'circle',
                source: 'concentration',
                filter: ['==', ['get', 'type'], 'point_source'],
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#ff0000',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        // Слой для кадастровых источников
        if (!map.getLayer('cadastre-sources')) {
            map.addLayer({
                id: 'cadastre-sources',
                type: 'circle',
                source: 'concentration',
                filter: ['==', ['get', 'type'], 'cadastre_source'],
                paint: {
                    'circle-radius': 8,
                    'circle-color': '#0000ff',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        const targetLayer = map.getStyle().layers.find(l => l.id.includes('water') || l.id.includes('land'));
        if (targetLayer) {
            map.moveLayer('concentration-fills', targetLayer.id);
        } else {
            // иначе просто на верх
            map.moveLayer('concentration-fills');
        }

        // Обработчики кликов
        map.on('click', 'concentration-fills', handleConcentrationClick);
        map.on('click', 'point-sources', handleSourceClick);
        map.on('click', 'cadastre-sources', handleSourceClick);

        // Изменение курсора при наведении
        map.on('mouseenter', 'concentration-fills', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'concentration-fills', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'point-sources', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'point-sources', () => {
            map.getCanvas().style.cursor = '';
        });
        map.on('mouseenter', 'cadastre-sources', () => {
            map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'cadastre-sources', () => {
            map.getCanvas().style.cursor = '';
        });

        layersAddedRef.current = true;
    }, [geojsonData, handleConcentrationClick, handleSourceClick]);

    const handleMapLoad = useCallback(() => {
        const map = mapRef.current?.getMap();
        if (map && geojsonData) {
            initializeLayers(map);

            const source = map.getSource('concentration');
            console.log('Source:', source);

            console.log('queryRenderedFeatures count (layer):', map.queryRenderedFeatures({layers: ['concentration-fills']}).length)
            const src = map.getSource && map.getSource('concentration') ? map.getSource('concentration')._data : null;
            const data = src || {
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[58.094092885610635, 56.124069563497194], [58.09406718352297, 56.124069563497194], [58.09406718352297, 56.124080820091145], [58.094092885610635, 56.124080820091145], [58.094092885610635, 56.124069563497194]]]
                    },
                    "properties": {"type": "concentration_cell"}
                }]
            };

            function featureDiagnostics(feat, idx = 0) {
                const g = feat.geometry;
                console.log('feature #' + idx, 'geom.type=', g.type, 'properties=', feat.properties);
                // sample coord
                const sample = (g.type === 'Point') ? g.coordinates : (g.type === 'Polygon' ? g.coordinates[0][0] : (g.type === 'MultiPolygon' ? g.coordinates[0][0][0] : null));
                console.log('sample coord', sample);
                // bbox
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                function acc(pt) {
                    const x = pt[0], y = pt[1];
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }

                if (g.type === 'Polygon') {
                    g.coordinates.forEach(ring => ring.forEach(acc));
                } else if (g.type === 'MultiPolygon') {
                    g.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(acc)));
                } else if (g.type === 'Point') {
                    acc(g.coordinates);
                }
                const bbox = [[minX, minY], [maxX, maxY]];
                console.log('bbox', bbox);
                // approximate planar signed area (first ring)
                if (g.type === 'Polygon') {
                    const ring = g.coordinates[0];
                    let area = 0;
                    for (let i = 0; i < ring.length - 1; i++) {
                        const [x1, y1] = ring[i], [x2, y2] = ring[i + 1];
                        area += x1 * y2 - x2 * y1;
                    }
                    console.log('signed area (deg^2, approx):', Math.abs(area / 2));
                }
                // heuristics for swapped coords: if first coord > 90 and second <= 90 => probably swapped
                if (sample) {
                    const [a, b] = sample;
                    console.log('coord heuristics: first=', a, ' second=', b);
                    if (Math.abs(a) > 90 && Math.abs(b) <= 90) console.warn('>>> Похоже координаты в порядке [lat, lon] (первое значение > 90). Попробуй swap.');
                }
                return {bbox};
            }

            const info = featureDiagnostics(data.features[0], 0);

            const b = info.bbox; // из предыдущего блока
            if (b && map && map.fitBounds) {
                // MapLibre expects bounds as [[minLon,minLat],[maxLon,maxLat]]
                map.fitBounds(b, {padding: 60, maxZoom: 18, duration: 500});
                console.log('map.fitBounds ->', b);
            } else {
                console.warn('Нет bbox или map/fn отсутствует');
            }
        }
    }, [geojsonData, initializeLayers]);

    // Обновляем данные при изменении geojsonData
    useEffect(() => {
        const map = mapRef.current?.getMap();
        if (map && geojsonData && layersAddedRef.current) {
            const source = map.getSource('concentration');
            if (source) {
                source.setData(geojsonData);
            }
        }
    }, [geojsonData]);

    return (
        <>
            {
                geojsonLoadedFull ?
                    <>
                        <div style={{
                            position: 'absolute',
                            zIndex: 9999
                        }}>
                            <Flex gap='5px'>
                                {
                                    timestamps
                                }
                            </Flex>
                        </div>
                        <Map style={{
                            height: '100vh',
                            width: '100vw'
                        }}
                             ref={mapRef}
                             mapStyle={'https://tiles.openfreemap.org/styles/liberty'}
                             onLoad={handleMapLoad}
                             interactiveLayerIds={['concentration-fills', 'point-sources', 'cadastre-sources']}
                        >
                        </Map>
                    </> : <p>Идет загрузка карты...</p>
            }
        </>
    )
}