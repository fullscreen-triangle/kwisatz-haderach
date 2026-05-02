import {useEffect, useRef} from "react";
import {dsnCN} from "../../hooks/helper";

declare const google: any;

interface MapProps {
    defaultCenter: { lat: number, lng: number },
    zoom?: number,
    height?: string,
    mapKey?: string,
    className?: string,
    mapIcon?: string
}


function Map({mapKey, defaultCenter, mapIcon, className, zoom, height, ...restProps}: MapProps) {

    const ref = useRef(null);
    const effects = useRef(false);


    useEffect(() => {


        if (effects.current) {
            return;
        }

        effects.current = true;


        if (!mapKey)
            return;


        const script = document.createElement("script");
        script.type = "text/javascript";
        script.id = "map_id";
        script.src = "https://maps.googleapis.com/maps/api/js?key=" + mapKey; //& needed
        document.body.appendChild(script);


        script.addEventListener("load", () => {
            const map = new google.maps.Map(ref.current, {
                center: {
                    lat: defaultCenter.lat,
                    lng: defaultCenter.lng,
                },
                mapTypeControl: false,
                scrollwheel: false,
                draggable: true,
                streetViewControl: false,
                navigationControl: false,
                zoom: zoom,
                styles: [
                    {
                        "featureType": "water",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#e9e9e9",
                            },
                            {
                                "lightness": 17,
                            },
                        ],
                    },
                    {
                        "featureType": "landscape",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#f5f5f5",
                            },
                            {
                                "lightness": 20,
                            },
                        ],
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry.fill",
                        "stylers": [
                            {
                                "color": "#ffffff",
                            },
                            {
                                "lightness": 17,
                            },
                        ],
                    },
                    {
                        "featureType": "road.highway",
                        "elementType": "geometry.stroke",
                        "stylers": [
                            {
                                "color": "#ffffff",
                            },
                            {
                                "lightness": 29,
                            },
                            {
                                "weight": 0.2,
                            },
                        ],
                    },
                    {
                        "featureType": "road.arterial",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#ffffff",
                            },
                            {
                                "lightness": 18,
                            },
                        ],
                    },
                    {
                        "featureType": "road.local",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#ffffff",
                            },
                            {
                                "lightness": 16,
                            },
                        ],
                    },
                    {
                        "featureType": "poi",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#f5f5f5",
                            },
                            {
                                "lightness": 21,
                            },
                        ],
                    },
                    {
                        "featureType": "poi.park",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#dedede",
                            },
                            {
                                "lightness": 21,
                            },
                        ],
                    },
                    {
                        "elementType": "labels.text.stroke",
                        "stylers": [
                            {
                                "visibility": "on",
                            },
                            {
                                "color": "#ffffff",
                            },
                            {
                                "lightness": 16,
                            },
                        ],
                    },
                    {
                        "elementType": "labels.text.fill",
                        "stylers": [
                            {
                                "saturation": 36,
                            },
                            {
                                "color": "#333333",
                            },
                            {
                                "lightness": 40,
                            },
                        ],
                    },
                    {
                        "elementType": "labels.icon",
                        "stylers": [
                            {
                                "visibility": "off",
                            },
                        ],
                    },
                    {
                        "featureType": "transit",
                        "elementType": "geometry",
                        "stylers": [
                            {
                                "color": "#f2f2f2",
                            },
                            {
                                "lightness": 19,
                            },
                        ],
                    },
                    {
                        "featureType": "administrative",
                        "elementType": "geometry.fill",
                        "stylers": [
                            {
                                "color": "#fefefe",
                            },
                            {
                                "lightness": 20,
                            },
                        ],
                    },
                    {
                        "featureType": "administrative",
                        "elementType": "geometry.stroke",
                        "stylers": [
                            {
                                "color": "#fefefe",
                            },
                            {
                                "lightness": 17,
                            },
                            {
                                "weight": 1.2,
                            },
                        ],
                    },
                ],
            });

            ref.current.addEventListener("resize", function () {
                google.maps.event.trigger(map, "resize");
                map.setCenter(map.getCenter());
            });


            new google.maps.Marker({
                position: new google.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
                animation: google.maps.Animation.BOUNCE,
                icon: mapIcon,
                title: "ASL",
                map: map,
            });
        })

        return () => {
            script.remove();
        };


    }, []); // eslint-disable-line react-hooks/exhaustive-deps


    return (
        <div className={dsnCN("w-100", className)} style={{height: height}} ref={ref} {...restProps} />
    );
}

Map.defaultProps = {
    height: "80vh",
    zoom: 14,
    mapIcon: "img/map-marker.png"
}

export default Map;







