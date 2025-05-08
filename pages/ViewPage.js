import React from "react";
import { ScrollView, View, Text, Image, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MainLayout from "../components/MainLayout";

export default function ViewPage({ route, navigation }) {
    // <— this will safely fall back to `undefined` if params is missing
    const build = route.params?.build;
  
    if (!build) {
      // nothing to show, bail back
      navigation.goBack();
      return null;
    }
  
    return (
      <MainLayout>
        <ScrollView className="flex-1 bg-semiblack p-4">
          <Text className="text-white text-2xl font-bold mb-2">{build.name}</Text>
          <Text className="text-gray-400 mb-6">{build.description}</Text>
  
          {Object.entries(build.components).map(([slot, comp]) =>
            comp ? (
              <View key={slot} className="bg-zinc-700 rounded-xl p-4 mb-4">
                <Text className="text-white font-bold text-lg mb-2">
                  {slot.toUpperCase()}
                </Text>
                <Image
                  source={{ uri: comp.image_url }}
                  className="h-60 w-full rounded-md mb-3"
                  resizeMode="cover"
                />
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
  
          <Pressable
            onPress={() => navigation.goBack()}
            className="self-center mb-8 bg-ymblue px-8 py-2 rounded-xl"
          >
            <Text className="text-white font-bold"> Close </Text>
          </Pressable>
        </ScrollView>
      </MainLayout>
    );
}