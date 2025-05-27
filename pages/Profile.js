// pages/ProfilePage.js
import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator
} from "react-native";
import MainLayout from "../components/MainLayout";
import EditProfile from "../components/EditProfile";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

export default function ProfilePage() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const token = await getToken();

      const profRes = await fetch(`${GLOBAL_URL}/get-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!profRes.ok) {
        if (profRes.status !== 404) {
          throw new Error("Failed to fetch profile");
        }
        return;
      }

      const profData = await profRes.json();
      setProfile(profData);

      const postRes = await fetch(`${GLOBAL_URL}/user-posts/${profData.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!postRes.ok) {
        if (postRes.status !== 404) {
          throw new Error("Failed to fetch posts");
        }
        return;
      }

      const postData = await postRes.json();
      setPosts(postData.map((p) => ({ ...p, created_at: new Date(p.created_at) })));
    } catch (err) {
      // Silent error handling - no console.error or alerts
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfileData();
    }, [])
  );

  const toggleLike = async (postId) => {
    try {
      const token = await getToken();
      const res = await fetch(
        `${GLOBAL_URL}/forum/posts/${postId}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) return;
      const { likes, liked } = await res.json();
      setPosts((ps) =>
        ps.map((p) =>
          p.id === postId ? { ...p, likes, liked } : p
        )
      );
    } catch {
      // Silent error handling
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center bg-semiblack">
          <ActivityIndicator size="large" color="#9fcfff" />
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ScrollView className="flex-1 bg-semiblack">
        <EditProfile />
        <View className="border-b border-gray-600 mt-4 mb-2">
          <Text className="text-white font-bold text-center py-2">
            Posts
          </Text>
        </View>

        {posts.length > 0 ? (
          posts.map((p) => (
            <Pressable
              key={p.id}
              onPress={() =>
                navigation.navigate("Forum", {
                  screen: "Discussion",
                  params: { post: p },
                })
              }
              className="m-4 bg-[#222] rounded-xl p-4"
            >
              {/* ... rest of your post rendering code ... */}
            </Pressable>
          ))
        ) : (
          <View className="items-center justify-center py-8">
            <Ionicons name="document-text-outline" size={48} color="#555" />
            <Text className="text-gray-500 mt-2">No posts yet</Text>
          </View>
        )}
      </ScrollView>
    </MainLayout>
  );
}