import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import MainLayout from "../components/MainLayout";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";

export default function OtherProfile() {
  const { userId } = useRoute().params;
  const navigation = useNavigation();

  const [profile, setProfile]     = useState(null);
  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState("Posts");
  const [error, setError]         = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();

        let res = await fetch(
          `${GLOBAL_URL}/get-other-profile?target_uid=${userId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error();
        const prof = await res.json();
        setProfile(prof);
        setIsFollowed(prof.is_following);

        res = await fetch(`${GLOBAL_URL}/user-posts/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPosts(data.map(p => ({ ...p, created_at: new Date(p.created_at) })));
      } catch (err) {
        console.error(err);
        setError("Failed to load profile or posts");
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const toggleFollow = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/follow-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ target_uid: userId })
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setIsFollowed(json.currently_following);
    } catch {
      Alert.alert("Error", "Could not update follow status");
    }
  };

  const sharePost = async postId => {
    try {
      await fetch(`${GLOBAL_URL}/forum/posts/${postId}/share`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await getToken()}` }
      });
      setPosts(ps =>
        ps.map(p => (p.id === postId ? { ...p, shares: (p.shares || 0) + 1 } : p))
      );
    } catch {
      Alert.alert("Error", "Could not share");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#9fcfff" />
        </View>
      </MainLayout>
    );
  }
  if (error || !profile) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <Text className="text-white">{error || "Unknown error"}</Text>
        </View>
      </MainLayout>
    );
  }

  const onlyPosts  = posts.filter(p => !p.build_id);
  const onlyBuilds = posts.filter(p => p.build_id != null && p.build_id !== "");

  return (
    <MainLayout>
      <ScrollView className="flex-1 bg-semiblack">
        <View className="flex-row justify-between items-center px-4 mt-6">
          <View className="flex-1 mr-4">
            <Text className="text-white text-xl font-bold text-helvetica">
              @{profile.username || "No username set"}
            </Text>
            <Text className="text-white text-helvetica">{profile.email}</Text>
            <Text className="mt-4 text-white text-helvetica">
              {profile.description || "No description set"}
            </Text>
            <Text className="text-gray-300 text-sm mt-1 text-helvetica">
              {profile.follower_count} followers
            </Text>
          </View>
          <Image
            source={
              profile.profile_picture !== "not set"
                ? { uri: profile.profile_picture }
                : require("../assets/images/bpp2.png")
            }
            className="h-24 w-24 rounded-full bg-gray-500"
            resizeMode="cover"
          />
        </View>

        <View className="flex-row px-4 mt-4 mb-6 space-x-4 gap-4">
          <Pressable
            onPress={toggleFollow}
            className={`flex-1 py-2 rounded-xl items-center ${
              isFollowed ? "bg-semiblack border border-ymblue" : "bg-ymblue"
            }`}
          >
            <Text
              className={`font-bold text-helvetica ${
                isFollowed ? "text-ymblue" : "text-black"
              }`}
            >
              {isFollowed ? "Followed" : "Follow"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => Alert.alert("Mention", `@${profile.username}`)}
            className="flex-1 bg-white py-2 rounded-xl items-center"
          >
            <Text className="text-black font-bold text-helvetica">Mention</Text>
          </Pressable>
        </View>

        <View className="flex-row border-b border-gray-600">
          {["Posts", "Builds"].map(t => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 items-center py-2 ${
                tab === t ? "border-b-2 border-white" : ""
              }`}
            >
              <Text className={`${tab === t ? "text-white font-bold" : "text-gray-400"}`}>
                {t}
              </Text>
            </Pressable>
          ))}
        </View>

        { (tab === "Posts" ? onlyPosts : onlyBuilds).map(p => (
          <Pressable
            key={p.id}
            onPress={() =>
              navigation.navigate("Discussion", { post: p, onComment: () => {} })
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
                  <View className="w-9 h-9 rounded-full bg-gray-800 mr-2 justify-center items-center">
                    <Ionicons name="person-circle-outline" size={36} color="white" />
                  </View>
                )}
                <Text className="text-white font-bold">@{p.username}</Text>
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
                <Text className="text-white font-bold">{p.build_data.name}</Text>
                <Text className="text-gray-300 text-sm mt-1">
                  {p.build_data.description}
                </Text>
              </View>
            )}
            <View className="flex-row justify-around pt-2 border-t border-gray-700">
              <Pressable onPress={() => toggleLike(p.id)} className="flex-row items-center">
                <Ionicons
                  name={p.liked ? "heart" : "heart-outline"}
                  size={20}
                  color={p.liked ? "red" : "#888"}
                />
                <Text className="text-gray-400 ml-1">{p.likes}</Text>
              </Pressable>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">{p.comments.length}</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("Forum", { repost: p })} className="flex-row items-center">
                <Ionicons name="repeat-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">0</Text>
              </Pressable>
              <Pressable onPress={() => sharePost(p.id)} className="flex-row items-center">
                <Ionicons name="share-social-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">{p.shares}</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </MainLayout>
  );
}