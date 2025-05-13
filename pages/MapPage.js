// pages/MapPage.js
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import MainLayout from "../components/MainLayout";
import { GLOBAL_URL } from "../ipconfig";
import { getToken } from "../utils/auth";

// Google Maps API Key - replace with your actual key
const GOOGLE_MAPS_API_KEY = "AIzaSyDrIYVGG00hdC6LAfuZQ2iTAZj4dtlS6x4";

export default function MapPage() {
  const mapRef = useRef();
  const [region, setRegion] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [dest, setDest] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pcStores, setPcStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [showStores, setShowStores] = useState(false);

  // get user location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let { coords } = await Location.getCurrentPositionAsync({ accuracy: 5 });
      setRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
      
      // Fetch nearby PC stores by default
      fetchNearbyPCStores(coords.latitude, coords.longitude);
    })();
  }, []);

  // Search places using Google Places API
  const onSearch = async () => {
    if (!query || !region) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          query
        )}&location=${region.latitude},${region.longitude}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      setResults(
        json.results.map((r) => ({
          id: r.place_id,
          title: r.name,
          address: r.formatted_address,
          lat: r.geometry.location.lat,
          lon: r.geometry.location.lng,
        }))
      );
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Failed to search locations");
    } finally {
      setLoading(false);
    }
  };

  // Fetch nearby PC component stores
  const fetchNearbyPCStores = async (lat, lon) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${GLOBAL_URL}/map/nearby-stores?lat=${lat}&lng=${lon}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPcStores(data);
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Could not fetch PC stores");
    }
  };

  // Get directions using Google Directions API
  const fetchRoute = async (lat, lon) => {
    if (!region) return;
    setDest({ latitude: lat, longitude: lon });
    setRouteCoords([]);
    setLoading(true);
    
    try {
      const origin = `${region.latitude},${region.longitude}`;
      const destination = `${lat},${lon}`;
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`
      );
      const json = await res.json();
      
      if (json.routes?.length) {
        const points = json.routes[0].overview_polyline.points;
        const line = decodePolyline(points);
        setRouteCoords(line);
        
        // Fit map to show the entire route
        mapRef.current.fitToCoordinates(line, {
          edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
          animated: true,
        });
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("Error", "Failed to get directions");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to decode Google's polyline encoding
  const decodePolyline = (encoded) => {
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;
    const array = [];
    
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      do {
        b = encoded.charAt(index++).charCodeAt(0) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      array.push({ latitude: lat * 1e-5, longitude: lng * 1e-5 });
    }
    return array;
  };

  const focusOnLocation = (lat, lng) => {
    mapRef.current.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  };

  if (!region) {
    return (
      <MainLayout>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#9fcfff" />
          <Text style={styles.loadingText}>Fetching your location...</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <View style={styles.container}>
        {/* Search bar */}
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#ccc"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          <TouchableOpacity onPress={onSearch} style={styles.searchBtn}>
            <Ionicons name="search" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* PC Stores Toggle */}
        <TouchableOpacity 
          style={styles.storesToggle}
          onPress={() => setShowStores(!showStores)}
        >
          <Text style={styles.storesToggleText}>
            {showStores ? 'Hide PC Stores' : 'Show PC Stores'}
          </Text>
        </TouchableOpacity>

        {/* Search results */}
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <FlatList
              style={styles.resultsList}
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.resultItem}
                  onPress={() => {
                    setResults([]);
                    fetchRoute(item.lat, item.lon);
                    focusOnLocation(item.lat, item.lon);
                  }}
                >
                  <View>
                    <Text style={styles.resultTitle}>{item.title}</Text>
                    <Text style={styles.resultAddress}>{item.address}</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color="#9fcfff" />
                </Pressable>
              )}
            />
          </View>
        )}

        {/* PC Stores list */}
        {showStores && (
          <View style={styles.storesContainer}>
            <Text style={styles.sectionTitle}>Nearby PC Component Stores</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={pcStores}
              keyExtractor={(item) => item.id.toString()}
              // In your FlatList renderItem for stores:
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeCard,
                    selectedStore?.id === item.id && styles.selectedStoreCard
                  ]}
                  onPress={() => {
                    setSelectedStore(item);
                    focusOnLocation(item.latitude, item.longitude);
                  }}
                >
                  <Text style={[
                    styles.storeName,
                    selectedStore?.id === item.id && styles.selectedStoreName
                  ]}>
                    {item.name}
                  </Text>
                  <Text style={[
                    styles.storeDistance,
                    selectedStore?.id === item.id && styles.selectedStoreDistance
                  ]}>
                    {item.distance} km
                  </Text>
                  <Text style={[
                    styles.storeAddress,
                    selectedStore?.id === item.id && styles.selectedStoreAddress
                  ]} numberOfLines={2}>
                    {item.address}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={true}
          customMapStyle={mapStyle}
        >
          {/* PC Stores markers */}
          {pcStores.map((store) => (
            <Marker
              key={store.id}
              coordinate={{
                latitude: store.latitude,
                longitude: store.longitude,
              }}
              onPress={() => {
                setSelectedStore(store);
                focusOnLocation(store.latitude, store.longitude);
              }}
            >
              <View style={styles.markerContainer}>
                <View style={[
                  styles.marker,
                  selectedStore?.id === store.id && styles.selectedMarker
                ]}>
                  <Ionicons name="hardware-chip" size={20} color="#fff" />
                </View>
                <Text style={styles.markerText}>{store.name}</Text>
              </View>
            </Marker>
          ))}

          {/* Destination marker */}
          {dest && (
            <Marker coordinate={dest}>
              <View style={styles.destinationMarker}>
                <Ionicons name="location" size={24} color="#ff0000" />
              </View>
            </Marker>
          )}

          {/* Route polyline */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor="#9fcfff"
              strokeWidth={4}
            />
          )}
        </MapView>

        {/* Current location button */}
        <TouchableOpacity
          style={styles.currentLocationBtn}
          onPress={() => {
            if (region) {
              mapRef.current.animateToRegion(region, 500);
            }
          }}
        >
          <Ionicons name="locate" size={24} color="#000" />
        </TouchableOpacity>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#9fcfff" />
          </View>
        )}

        {/* Selected store info */}
        {selectedStore && (
          <View style={styles.storeInfoContainer}>
            <Text style={styles.storeInfoName}>{selectedStore.name}</Text>
            <Text style={styles.storeInfoAddress}>{selectedStore.address}</Text>
            <Text style={styles.storeInfoDistance}>
              {selectedStore.distance} km away
            </Text>
            <View style={styles.storeInfoButtons}>
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={() => {
                  fetchRoute(selectedStore.latitude, selectedStore.longitude);
                }}
              >
                <Ionicons name="navigate" size={16} color="#fff" />
                <Text style={styles.directionsButtonText}>Directions</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  // Navigate to store details or open website
                  Alert.alert(
                    "Store Info",
                    `Would you like to visit ${selectedStore.name}'s website?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Open Website", onPress: () => 
                        // You would use Linking.openURL here
                        console.log("Open website")
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.viewButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </MainLayout>
  );
}

// Custom map styling
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#1d2c4d"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#8ec3b9"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#1a3646"
      }
    ]
  },
  {
    "featureType": "administrative.country",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#4b6878"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#64779e"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#d59563"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#263c3f"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#6b9a76"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#304a7d"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#2c6675"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [
      {
        "color": "#255763"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#b0d5ce"
      }
    ]
  },
  {
    "featureType": "transit",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#98a5be"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#0e1626"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#4e6d70"
      }
    ]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#161010",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#161010",
  },
  loadingText: {
    color: "#fff",
    marginTop: 8,
    fontFamily: "Helvetica",
  },
  searchBox: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    height: 45,
    fontFamily: "Helvetica",
    fontSize: 16,
  },
  searchBtn: {
    padding: 8,
    backgroundColor: "#9fcfff",
    borderRadius: 6,
    marginLeft: 8,
  },
  resultsContainer: {
    position: "absolute",
    top: 60,
    left: 10,
    right: 10,
    maxHeight: 300,
    zIndex: 9,
    backgroundColor: "#222",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  resultsList: {
    padding: 8,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultTitle: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
  },
  resultAddress: {
    color: "#ccc",
    fontFamily: "Helvetica",
    fontSize: 12,
    marginTop: 4,
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
  currentLocationBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 20,
  },
  storesToggle: {
    position: "absolute",
    top: 65,
    right: 10,
    backgroundColor: "#9fcfff",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  storesToggleText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: "#000",
  },
  storesContainer: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 10,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  sectionTitle: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 10,
  },
  storeCard: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    width: 180,
  },
  selectedStoreCard: {
    backgroundColor: "#9fcfff",
  },
  storeName: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  selectedStoreName: {  // New style for selected store name
    color: "#000",
  },
  storeDistance: {
    color: "#9fcfff",
    fontFamily: "Helvetica",
    fontSize: 12,
    marginTop: 4,
  },
  selectedStoreDistance: {  // New style for selected store distance
    color: "#000",
  },
  storeAddress: {
    color: "#ccc",
    fontFamily: "Helvetica",
    fontSize: 11,
    marginTop: 4,
  },
  selectedStoreAddress: {  // New style for selected store address
    color: "#333",
  },
  markerContainer: {
    alignItems: "center",
  },
  marker: {
    backgroundColor: "#9fcfff",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
  },
  selectedMarker: {
    backgroundColor: "#ff6b6b",
    transform: [{ scale: 1.2 }],
  },
  markerText: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 4,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  destinationMarker: {
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 4,
    borderRadius: 20,
  },
  storeInfoContainer: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    padding: 15,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  storeInfoName: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
    marginBottom: 5,
  },
  storeInfoAddress: {
    color: "#ccc",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginBottom: 5,
  },
  storeInfoDistance: {
    color: "#9fcfff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 10,
  },
  storeInfoButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  directionsButton: {
    backgroundColor: "#9fcfff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    justifyContent: "center",
  },
  directionsButtonText: {
    color: "#000",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginLeft: 5,
  },
  viewButton: {
    backgroundColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
});