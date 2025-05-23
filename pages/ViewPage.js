import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, Image, Pressable, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MainLayout from "../components/MainLayout";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";

export default function ViewPage({ route, navigation }) {
  const [viewBuild, setViewBuild] = useState(null);
  const buildId = route.params?.buildId;
  const buildFromParams = route.params?.build;

  useEffect(() => {
    if (buildFromParams) {
      console.log("📦 Build passed directly:", buildFromParams);
      setViewBuild(buildFromParams);
      return;
    }

    if (!buildId) {
      Alert.alert("Error", "No build ID provided.");
      navigation.goBack();
      return;
    }

    const fetchBuild = async () => {
      try {
        console.log("📥 Fetching build with ID:", buildId);
        const token = await getToken();
        const res = await fetch(`${GLOBAL_URL}/get-certain-build/${buildId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch build");
        const data = await res.json();
        console.log("✅ Got build data:", data);
        setViewBuild(data);
      } catch (err) {
        console.error("❌ Build fetch failed:", err);
        Alert.alert("Error", err.message || "Build not found");
        navigation.goBack();
      }
    };

    fetchBuild();
  }, []);

  if (!viewBuild) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </MainLayout>
    );
  }

  const TotalPrice = viewBuild.components
    ? Object.values(viewBuild.components).reduce((sum, comp) => sum + (comp?.price || 0), 0)
    : 0;

  return (
    <MainLayout>
      <ScrollView className="flex-1 bg-semiblack p-4">
        <Text className="text-white text-2xl font-bold mb-2">{viewBuild.name}</Text>
        <Text className="text-gray-400 mb-6">{viewBuild.description}</Text>

        {viewBuild.components && Object.entries(viewBuild.components).map(([slot, comp]) =>
          comp ? (
            <View key={slot} className="bg-zinc-700 rounded-xl p-4 mb-4">
              <Text className="text-white font-bold text-lg mb-2">{slot.toUpperCase()}</Text>
              {comp.image_url && (
                <Image
                  source={{ uri: comp.image_url }}
                  className="h-60 w-full rounded-md mb-3"
                  resizeMode="cover"
                />
              )}
              <Text className="text-white font-bold">{comp.name}</Text>
              <Text className="text-gray-300 mb-1">
                Rp {comp.price?.toLocaleString() ?? "-"}
              </Text>
              {comp.rating != null && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="star" size={16} color="gold" />
                  <Text className="text-gray-300 ml-1 text-xs">
                    {Number(comp.rating).toFixed(1)}
                  </Text>
                </View>
              )}
              <Text className="text-gray-300 text-sm">
                {comp.description ?? "No description available"}
              </Text>
            </View>
          ) : null
        )}

        <View className="mb-2">
          <Text className="text-white font-bold">
            Total Price: Rp. {TotalPrice.toLocaleString()}
          </Text>
        </View>

        <Pressable
          onPress={() => navigation.goBack()}
          className="self-center mb-8 bg-ymblue px-8 py-2 rounded-xl"
        >
          <Text className="text-white font-bold">Close</Text>
        </Pressable>
      </ScrollView>
    </MainLayout>
  );
}
