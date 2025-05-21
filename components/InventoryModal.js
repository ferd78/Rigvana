import { useEffect, useState } from "react";
import { View, Text, Modal, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { GLOBAL_URL } from "../ipconfig";
import { getToken } from "../utils/auth";
import { Ionicons } from "@expo/vector-icons";
import SearchBar from "./SearchBar";

function InventoryModal({ visible, onClose, storeId }) {
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const normalize = (str) =>
    str?.toLowerCase().replace(/[\u2018\u2019']/g, "").trim();

  useEffect(() => {
    if (!storeId || !visible) return;

    const fetchInventory = async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${GLOBAL_URL}/stores/${storeId}/inventory`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setInventoryData(data);
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [storeId, visible]);

  const getFilteredInventory = () => {
    if (!inventoryData?.inventory) return {};

    const query = normalize(searchText);
    const filtered = {};

    for (const [category, items] of Object.entries(inventoryData.inventory)) {
      const matched = items.filter((item) =>
        normalize(item.name).includes(query)
      );
      if (matched.length > 0) filtered[category] = matched;
    }

    return filtered;
  };

  const filteredInventory = getFilteredInventory();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View className="flex-1 bg-zinc-900 bg-black/50 justify-center items-center">
        <View className="h-3/4 w-4/5 bg-zinc-800 p-5 rounded-xl">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-white text-xl font-bold">Inventory</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close-outline" color={"white"} size={24} />
            </Pressable>
          </View>

          <SearchBar
            placeholder="Search item..."
            value={searchText}
            onChangeText={setSearchText}
          />

          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
          ) : (
            <ScrollView className="space-y-4 mt-4" showsVerticalScrollIndicator={false}>
              {Object.entries(filteredInventory).map(([category, items]) => (
                <View key={category}>
                  <Text className="text-white font-semibold mb-2">{category}</Text>
                  {items.map((item) => (
                    <View
                      key={item.item_id}
                      className="ml-2 pl-2 border-l border-zinc-600 mb-4"
                    >
                      <Text className="text-zinc-200">{item.name}</Text>
                      <Text className="text-zinc-400 text-xs">
                        Quantity: {item.quantity} | Rp {item.price.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}

              {Object.keys(filteredInventory).length === 0 && (
                <Text className="text-zinc-400 text-sm text-center">No items found.</Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default InventoryModal;
