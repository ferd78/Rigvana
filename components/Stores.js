import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GLOBAL_URL } from "../ipconfig";
import { useMapControl } from "../context/MapControlContext";
import * as Location from "expo-location";
import InventoryModal from "./InventoryModal";

function Stores({data}) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const { mapRef, setFocusedStore } = useMapControl();
  const [userLocation, setUserLocation] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const fetchStores = async () => {
    try {
      const res = await fetch(`${GLOBAL_URL}/stores`);
      const text = await res.text();
      const data = JSON.parse(text);

      const fixed = data.map((item) => ({
        ...item,
        location: {
          latitude: item.location.lat,
          longitude: item.location.lng,
        },
      }));

      setStores(fixed);
    } catch (error) {
      console.error("Failed to fetch stores:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDistanceFromUser = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const { coords } = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
      }
    })();

    fetchStores();
  }, []);

  const renderStoreItem = ({ item }) => (
    <Pressable className="flex-row justify-between items-center px-4 py-3 bg-zinc-700 rounded-lg my-1">
      <View>
        <Text className="text-white font-semibold">{item.name}</Text>
        <Text className="text-zinc-400 text-sm">{item.address}</Text>

        {userLocation && (
          <Text className="text-zinc-400 text-xs mt-1">
            📍{" "}
            {getDistanceFromUser(
              userLocation.latitude,
              userLocation.longitude,
              item.location.latitude,
              item.location.longitude
            ).toFixed(2)}{" "}
            km away
          </Text>
        )}

        <View className="flex-row gap-1 mt-1 items-center">
          <Ionicons name="star" size={14} color="gold" />
          <Text className="text-yellow-400 text-xs">{item.rating ?? "N/A"}</Text>
        </View>
      </View>

      <View className="gap-4 flex-row">
        <Pressable
          onPress={() => {
            setSelectedStoreId(item.store_id);
            setModalVisible(true);
          }}
        >
          <Ionicons name="eye-outline" color={"white"} size={24} />
        </Pressable>

        <InventoryModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          storeId={selectedStoreId}
        />

        <Pressable
          onPress={() => {
            if (
              item.location?.latitude !== undefined &&
              item.location?.longitude !== undefined
            ) {
              setFocusedStore(item);
              mapRef.current?.animateToRegion(
                {
                  latitude: item.location.latitude,
                  longitude: item.location.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                },
                500
              );

              setTimeout(() => setFocusedStore(null), 5000);
            }
          }}
        >
          <Ionicons name="return-up-forward-outline" size={24} color="#fff" />
        </Pressable>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 px-4 pt-4">
      <Text className="text-white text-xl font-bold mb-3">Available Stores</Text>

      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.store_id}
          renderItem={renderStoreItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

export default Stores;
