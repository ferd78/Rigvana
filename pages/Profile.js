// pages/ProfilePage.js
import React, { useState, useEffect } from "react";
import {
  ScrollView,
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  Alert
} from "react-native";
import MainLayout from "../components/MainLayout";
import EditProfile from "../components/EditProfile";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";

export default function ProfilePage() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();

        const profRes = await fetch(`${GLOBAL_URL}/get-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!profRes.ok) throw new Error("Failed to fetch profile");
        const profData = await profRes.json();
        setProfile(profData);
        const postRes = await fetch(
          `${GLOBAL_URL}/user-posts/${profData.uid}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!postRes.ok) throw new Error("Failed to fetch posts");
        const postData = await postRes.json();
        setPosts(
          postData.map((p) => ({ ...p, created_at: new Date(p.created_at) }))
        );
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Could not load your posts");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      if (!res.ok) throw new Error();
      const { likes, liked } = await res.json();
      setPosts((ps) =>
        ps.map((p) =>
          p.id === postId ? { ...p, likes, liked } : p
        )
      );
    } catch {
      Alert.alert("Error", "Could not toggle like");
    }
  };

  const sharePost = async (postId) => {
    try {
      const token = await getToken();
      await fetch(`${GLOBAL_URL}/forum/posts/${postId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPosts((ps) =>
        ps.map((p) =>
          p.id === postId
            ? { ...p, shares: (p.shares || 0) + 1 }
            : p
        )
      );
    } catch {
      Alert.alert("Error", "Could not share post");
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

        {posts.map((p) => (
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
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                {p.profile_picture_url ? (
                  <Image
                    source={{ uri: p.profile_picture_url }}
                    className="w-9 h-9 rounded-full mr-2"
                  />
                ) : (
                  <View className="w-9 h-9 bg-gray-800 rounded-full mr-2 justify-center items-center">
                    <Ionicons
                      name="person-circle-outline"
                      size={36}
                      color="white"
                    />
                  </View>
                )}
                <Text className="text-white font-bold">
                  @{p.username}
                </Text>
              </View>
              <Ionicons name="chatbubble-outline" size={20} color="#888" />
            </View>
            <Text className="text-white mb-2">{p.text}</Text>
            {p.image_url && (
              <Image
                source={{ uri: p.image_url }}
                className="w-full h-48 rounded-xl mb-2"
              />
            )}
            {p.build_data && (
              <View className="bg-gray-700 rounded-lg p-3 mb-2">
                <Text className="text-white font-bold">
                  {p.build_data.name}
                </Text>
                <Text className="text-gray-300 text-sm mt-1">
                  {p.build_data.description}
                </Text>
              </View>
            )}

            <View className="flex-row justify-around pt-2 border-t border-gray-700">
              <Pressable
                onPress={() => toggleLike(p.id)}
                className="flex-row items-center"
              >
                <Ionicons
                  name={p.liked ? "heart" : "heart-outline"}
                  size={20}
                  color={p.liked ? "red" : "#888"}
                />
                <Text className="text-gray-400 ml-1">{p.likes}</Text>
              </Pressable>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">
                  {p.comments.length}
                </Text>
              </View>
            {/* this part is for the share button, Harman said dia gak suka jadi I comment out */}
            {/*  <Pressable
                onPress={() => sharePost(p.id)}
                className="flex-row items-center"
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color="#888"
                />
                <Text className="text-gray-400 ml-1">{p.shares}</Text>
              </Pressable> */}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </MainLayout>
  );
}
