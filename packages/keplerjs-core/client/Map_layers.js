
_.extend(Kepler.Map, {

	_initLayers: function(map) {

		var layers = {};

		layers.baselayer = new L.TileLayer(' ');

		layers.users = new L.LayerGroup();

		layers.cursor = new L.Cursor({
			className: 'marker-cursor'
		})
		layers.cursor.marker.on('add', function(e) {
			var div = L.DomUtil.create('div'),
				ll = this.getLatLng(),
				cursorData = {
					loc: [ll.lat, ll.lng]
				};
			Blaze.renderWithData(Template.popupCursor, cursorData, div);
			this.bindPopup(div.firstChild);
		});

		if(L.MarkerClusterGroup)
		layers.cluster = new L.MarkerClusterGroup({
			spiderfyDistanceMultiplier: 1.4,
			showCoverageOnHover: false,
			maxClusterRadius: 40,
			iconCreateFunction: function(clust) {

				clust.getCheckinsCount = function() {
					var places = _.map(clust.getAllChildMarkers(), function(marker) {
						return marker.item.id;
					});
					return K.findCheckinsCountByPlaces(places);
				};
				
				var div = L.DomUtil.create('div');
				
				Blaze.renderWithData(Template.markerCluster, clust, div);
				
				return new L.NodeIcon({
					className: 'marker-cluster',
					nodeHtml: div
				});
			}
		});

		layers.places = new L.LayerJSON({
			caching: false,
			layerTarget: layers.cluster,
			minShift: K.settings.public.map.bboxMinShift,
			callData: function(bbox, callback) {

				var sub = Meteor.subscribe('placesByBBox', bbox, function() {
					callback( K.findPlacesByBBox(bbox).fetch() );
				});

				return {
					abort: sub.stop
				};
			},
			propertyId: '_id',			
			dataToMarker: function(data) {	//eseguito una sola volta per ogni place
				var place= K.placeById(data._id),
					mark = place.marker;
				//console.log('dataToMarker',data,place,mark)
				return mark;
			}
		});


		layers.geojson = new L.GeoJSON(null, {
			//DEBUG autoclear: false,
			
			style: function (feature) {
				return K.settings.public.map.styles.default;
			},
			pointToLayer: function(feature, latlng) {	//costruisce marker POI

//TODO feature.templateMarker!!! for markler icon

/*				var iconPoi = L.DomUtil.create('div');
				L.DomUtil.create('i', 'icon icon-'+feature.properties.type, iconPoi);
*/
				return new L.Marker(latlng, {
						icon: new L.NodeIcon({
							className:'marker-poi',
							//nodeHtml: iconPoi
						})
					});

			},
			onEachFeature: function (feature, layer) {
				if(feature && feature.templatePopup && Template[feature.templatePopup]) {
					var div = L.DomUtil.create('div','popup-geojson');
					Blaze.renderWithData(Template[feature.templatePopup], feature, div);
					layer.bindPopup(div, {closeButton:false} );	
				}
			}
		});

		map.on('moveend zoomend', function(e) {
			//autoclean geojson layer
			if(layers.geojson.getLayers().length) {
				if(e.target.getBoundsZoom(layers.geojson.getBounds()) - e.target.getZoom() > 2)
					layers.geojson.clearLayers();
			}
		});

		return layers;
	}
});