// pages/NotificationsPage.js
import React from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MainLayout from "../components/MainLayout";

export default function NotificationsPage() {
  const dummyNotifications = [
    {
      id: "n1",
      type: "text",
      title: "New Comment",
      body: "santoagd commented: “Looks amazing!”",
    },
    {
      id: "n2",
      type: "image",
      title: "New Post",
      body: "ISsmFailure shared a new PC build image.",
      imageUri:
        "https://i.imgur.com/qkdpN.jpg",
    },
    {
      id: "n3",
      type: "build_share",
      title: "New Post",
      body: "user123 just shared a build:",
      build: {
        name: "Home Office PC",
        description: "mini ITX, i5, 16GB RAM, RTX 3060",
      },
    },
  ];

  const handlePress = (notif) => {
    // i did this for debugging to see if the notifs bisa dipencet atau ga
    console.log("yang dipencet:", notif.id);
  };

  return (
    <MainLayout>
      <ScrollView className="flex-1 px-4 py-6 bg-[#161010]">
        <Text className="text-white text-lg font-helvetica-bold mb-4">
          Notifications
        </Text>

        {dummyNotifications.length === 0 && (
          <View className="p-4 bg-neutral-800 rounded-lg">
            <Text className="text-gray-400">You have no new notifications.</Text>
          </View>
        )}

        {dummyNotifications.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => handlePress(n)}
            className="bg-neutral-800 p-4 rounded-xl mb-4"
          >
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#9fcfff"
              />
              <Text className="text-white font-helvetica-bold text-base ml-2">
                {n.title}
              </Text>
            </View>

            {n.type === "text" && (
              <Text className="text-gray-400 font-helvetica text-sm leading-tight">
                {n.body}
              </Text>
            )}

            {n.type === "image" && n.imageUri && (
              <>
                <Image
                  source={{ uri: n.imageUri }}
                  className="w-full h-36 rounded-lg mb-3"
                  resizeMode="cover"
                />
                <Text className="text-gray-400 font-helvetica text-sm leading-tight">
                  {n.body}
                </Text>
              </>
            )}

            {/* for this one i actually don't know how the api works jadi ya gitu lah */}
            {n.type === "build_share" && n.build && (
              <View className="bg-gray-700 rounded-lg p-3">
                <Text className="text-gray-300 font-helvetica text-sm mb-1">
                  {n.body}
                </Text>
                <View className="bg-[#9fcfff] rounded-lg p-3">
                  <Text className="text-black font-helvetica-bold text-base">
                    {n.build.name}
                  </Text>
                  <Text className="text-black font-helvetica text-sm mt-1">
                    {n.build.description}
                  </Text>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </MainLayout>
  );
}
