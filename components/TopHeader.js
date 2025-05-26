import React, { useState, useCallback } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";
import "../global.css";

export default function TopHeader() {
  const nav = useNavigation();
  const route = useRoute();
  const showUnderline = route.name !== "Forum";

  const [hasUnread, setHasUnread] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      async function fetchNotifications() {
        try {
          const token = await getToken();
          const res = await fetch(`${GLOBAL_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const all = await res.json();
          if (isActive) {
            setHasUnread(all.some(n => !n.is_read));
          }
        } catch (err) {
          console.warn("Header unread check failed:", err);
        }
      }

      fetchNotifications();
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <>
      <View className="pt-10 px-4 flex-row items-center justify-between">
        <Text className="text-ymblue font-jura-bold text-3xl tracking-widest">
          RIGVANA
        </Text>
{/* this is for the notif icon */}

        <View className="flex-row gap-5 items-center">
          <Pressable onPress={() => nav.navigate("Notifications")} className="relative">
            <Ionicons name="notifications-outline" color="white" size={28} />
            {hasUnread && (
              <View
                className="absolute mr-1 mt-1 top-0 right-0 w-3 h-3 bg-[#9fcfff] rounded-full"
              />
            )}
          </Pressable>
{/* this is for the settiings icon */}
          <Pressable onPress={() => nav.navigate("Settings")}>
            <Ionicons name="settings-outline" color="white" size={28} />
          </Pressable>
        </View>
      </View>

      {showUnderline && <View className="h-px w-screen bg-zinc-700 mt-4" />}
    </>
  );
}
