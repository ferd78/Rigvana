import { View, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import MainLayout from "../components/MainLayout";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import SearchBar from "../components/SearchBar";
import Stores from "../components/Stores";
import { useMapControl } from "../context/MapControlContext";
import { GLOBAL_URL } from "../ipconfig";

function MapPage() {
  const { mapRef, focusedStore } = useMapControl();
  const [region, setRegion] = useState(null);
  const [stores, setStores] = useState([]);
  const [searchText, setSearchText] = useState("");

  const normalize = (str) =>
    str?.toLowerCase().replace(/[\u2018\u2019']/g, "").trim();

  const filteredStores = stores.filter((store) =>
    normalize(store?.name ?? "").includes(normalize(searchText))
  );

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const { coords } = await Location.getCurrentPositionAsync({ accuracy: 5 });
        setRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });

        await fetchStores();
      } catch {
        // Silent location error
      }
    })();
  }, []);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${GLOBAL_URL}/stores`);
      if (!res.ok) return;
      
      const text = await res.text();
      const data = JSON.parse(text);
      
      const fixed = data.map((item, index) => ({
        ...item,
        id: item.id || `store-${index}`, // Ensure ID exists
        location: {
          latitude: item.location.lat,
          longitude: item.location.lng,
        },
      }));
      
      setStores(fixed);
    } catch {
      // Silent all errors
    }
  };

  return (
    <MainLayout>
      <View className="items-center mt-4 mb-2">
        <SearchBar 
          value={searchText} 
          onChangeText={setSearchText} 
          placeholder={"Search stores.."}
        />
      </View>
      
      <View className="items-center mt-2">
        {region ? (
          <View style={{ borderRadius: 12, overflow: "hidden", width: 390, height: 390 }}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={region}
              showsUserLocation
            >
              {filteredStores.map((store) => (
                <Marker
                  key={store.id} // Now using guaranteed unique ID
                  coordinate={{
                    latitude: store.location.latitude,
                    longitude: store.location.longitude,
                  }}
                  title={store.name}
                  description={`${store.distance} km away`}
                />
              ))}

              {focusedStore && (
                <Marker
                  key="focused"
                  coordinate={{
                    latitude: focusedStore.location.latitude,
                    longitude: focusedStore.location.longitude,
                  }}
                  title={focusedStore.name}
                  description="Selected store"
                  pinColor="red"
                />
              )}
            </MapView>
          </View>
        ) : (
          <ActivityIndicator color="#9fcfff" size="large" />
        )}
      </View>

      <Stores data={filteredStores} />
    </MainLayout>
  );
}

export default MapPage;