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
} from "react-native";
import MapView, { UrlTile, Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

export default function MapPage() {
  const mapRef = useRef();
  const [region, setRegion] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [dest, setDest] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);

  // 1️⃣ get user location
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
    })();
  }, []);

  // 2️⃣ search OSM Nominatim
  const onSearch = async () => {
    if (!query) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}`
      );
      const json = await res.json();
      setResults(
        json.map((r) => ({
          id: r.place_id,
          title: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
        }))
      );
    } catch (e) {
      console.warn(e);
    }
  };

  // 3️⃣ fetch route via OSRM
  const fetchRoute = async (lat, lon) => {
    if (!region) return;
    setDest({ latitude: lat, longitude: lon });
    // clear old
    setRouteCoords([]);
    try {
      const coords = `${region.longitude},${region.latitude};${lon},${lat}`;
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );
      const json = await res.json();
      if (json.routes?.length) {
        const line = json.routes[0].geometry.coordinates.map(([x, y]) => ({
          latitude: y,
          longitude: x,
        }));
        setRouteCoords(line);
        mapRef.current.fitToCoordinates(line, {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  if (!region) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#9fcfff" />
        <Text style={styles.loadingText}>Fetching your location…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a place…"
          placeholderTextColor="#ccc"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.searchBtn} onPress={onSearch}>
          <Text style={styles.searchBtnText}>Go</Text>
        </Pressable>
      </View>

      {/* Search results */}
      {results.length > 0 && (
        <FlatList
          style={styles.resultsList}
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Pressable
              style={styles.resultItem}
              onPress={() => {
                setResults([]);
                fetchRoute(item.lat, item.lon);
              }}
            >
              <Text style={styles.resultText}>{item.title}</Text>
            </Pressable>
          )}
        />
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
      >
        {/* OSM tiles */}
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          tileSize={256}
        />

        {/* Destination marker */}
        {dest && <Marker coordinate={dest} />}

        {/* Route polyline */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#009688"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#161010" },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#161010",
  },
  loadingText: { color: "#fff", marginTop: 8 },
  searchBox: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    zIndex: 10,
    flexDirection: "row",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    height: 40,
    fontFamily: "Helvetica",
  },
  searchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#9fcfff",
    borderRadius: 6,
    marginLeft: 8,
  },
  searchBtnText: {
    fontFamily: "Helvetica-Bold",
    color: "#000",
  },
  resultsList: {
    position: "absolute",
    top: 56,
    left: 10,
    right: 10,
    maxHeight: 200,
    backgroundColor: "#333",
    borderRadius: 8,
    zIndex: 9,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  resultText: {
    color: "#fff",
    fontFamily: "Helvetica",
  },
  map: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  },
});
