import { View, Text, Image, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useState, useEffect } from "react";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { getToken } from "../utils/auth";
import { GLOBAL_URL } from "../ipconfig";

function OtherProfile() {
  const route = useRoute();
  const { userId } = route.params;
  const nav = useNavigation();

  const [profile, setProfile] = useState(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOtherProfile = async () => {
      try {
        const token = await getToken();

        // Decode token (Firebase JWT format)
        let myUid = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          myUid = payload.user_id || payload.uid || payload.sub;
        } catch (decodeErr) {
          console.warn("⚠️ Failed to decode token:", decodeErr);
        }

        console.log("👤 Logged-in UID:", myUid);
        console.log("🎯 Target UID:", userId);

        // Redirect if same user
        if (myUid && myUid === userId) {
          nav.navigate("MainTabs", { screen: "Profile" });
          return;
        }

        const endpoint = `${GLOBAL_URL}/get-other-profile?target_uid=${userId}`;
        console.log("📡 Fetching from:", endpoint);

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("📦 Response status:", res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error("❌ Backend response:", errorText);
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();
        console.log("✅ Fetched profile:", data);

        setProfile(data);
        setIsFollowed(data?.is_following ?? false);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchOtherProfile();
  }, [userId]);

  const toggleFollow = async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/follow-user`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target_uid: userId }),
      });

      if (!res.ok) throw new Error("Follow failed");

      const result = await res.json();
      setIsFollowed(result.currently_following);
    } catch (err) {
      console.error("Follow toggle failed:", err);
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
          <Text className="text-white text-helvetica">{error || "Unknown error"}</Text>
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <ScrollView className="p-4">
        {/* Back Button */}
        <Pressable onPress={() => nav.navigate("MainTabs", { screen: "Forum" })}>
          <Ionicons name="arrow-back-outline" size={28} color={"white"} className="mb-2" />
        </Pressable>

        {/* Profile Header */}
        <View className="flex-row justify-between items-center mb-6">
          <View className="flex-1 mr-4">
            <Text className="text-white text-xl font-bold text-helvetica">@{profile.username}</Text>
            <Text className="text-white text-helvetica">{profile.email}</Text>
            <Text className="text-white mt-4 text-helvetica">{profile.description}</Text>
            <Text className="text-white mt-1 text-sm text-gray-300 text-helvetica">
              {profile.follower_count} followers
            </Text>
          </View>
          <Image
            source={
              profile.profile_picture && profile.profile_picture !== "not set"
                ? { uri: profile.profile_picture }
                : require("../assets/images/bpp2.png")
            }
            className="w-24 h-24 rounded-full bg-gray-600"
            resizeMode="cover"
          />
        </View>

        {/* Buttons */}
        <View className="flex-row justify-center mb-6 gap-2">
          <Pressable
            onPress={toggleFollow}
            className={`w-52 py-2 rounded-xl items-center ${
              isFollowed ? 'bg-semiblack border border-ymblue' : 'bg-ymblue'
            }`}
          >
            <Text
              className={`font-bold text-helvetica ${
                isFollowed ? 'text-ymblue' : 'text-black'
              }`}
            >
              {isFollowed ? 'Followed' : 'Follow'}
            </Text>
          </Pressable>
          <Pressable className="bg-white w-52 py-2 rounded-xl items-center border border-transparent">
            <Text className="text-black font-bold text-helvetica">Mention</Text>
          </Pressable>
        </View>
      </ScrollView>
    </MainLayout>
  );
}

export default OtherProfile;
