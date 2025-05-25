// pages/SearchPage.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";

export default function SearchPage() {
  const nav = useNavigation();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${GLOBAL_URL}/get-all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered([]);
    } else {
      setFiltered(
        users.filter((u) =>
          u.username.toLowerCase().includes(q)
        )
      );
    }
  }, [query, users]);

  return (
    <MainLayout>
      <View className="flex-1 bg-semiblack p-4">
        {/* Search Bar */}
        <View className="flex-row items-center bg-slate-800 rounded-xl px-4 py-2 mb-4">
          <Ionicons name="search-outline" size={20} color="gray" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by username…"
            placeholderTextColor="gray"
            className="flex-1 text-white ml-2"
          />
          {query !== "" && (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={18} color="#888" />
            </Pressable>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#9fcfff" className="mt-8" />
        ) : (
          <ScrollView>
            {filtered.map((u) => (
              <Pressable
                key={u.uid}
                className="flex-row items-center bg-slate-800 p-3 rounded-xl mb-3"
                onPress={() => nav.navigate("OtherProfile", { userId: u.uid })}
              >
                {u.profile_picture !== "not set" ? (
                  <Image
                    source={{ uri: u.profile_picture }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-gray-700 mr-3 items-center justify-center">
                    <Ionicons name="person-outline" size={24} color="#888" />
                  </View>
                )}
                <View>
                  <Text className="text-white font-bold">{u.username}</Text>
                  <Text className="text-gray-400 text-sm">
                    {u.follower_count} followers
                  </Text>
                </View>
              </Pressable>
            ))}

            {query.trim() !== "" && filtered.length === 0 && (
              <Text className="text-gray-400 text-center mt-8">
                No users found for “{query}”
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </MainLayout>
  );
}
