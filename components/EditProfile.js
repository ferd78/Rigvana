import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useCallback } from "react";
import ProfileModal from "./ProfileModal";
import PictureModal from "./PictureModal";
import { getToken } from '../utils/auth';
import { GLOBAL_URL } from "../ipconfig";

function EditProfile() {
  const [showModal, setShowModal] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  const [profile, setProfile] = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/get-profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch profile');

      const data = await response.json();
      console.log("Profile data:", data);
      setProfile(data);

      // Optionally fetch followers from separate endpoint
      const followRes = await fetch(`${GLOBAL_URL}/get-followers-count`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (followRes.ok) {
        const followData = await followRes.json();
        setFollowerCount(followData.follower_count || 0);
      } else {
        console.warn("Failed to fetch follower count");
        setFollowerCount(0);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-white text-helvetica">{error}</Text>
      </View>
    );
  }

  return (
    <>
      {/* Profile Header */}
      <View className="flex-row justify-between items-center px-4 mt-6">
        {/* Left: Info */}
        <View className="flex-1 mr-4">
          <Text className="text-white text-xl font-bold text-helvetica">
            @{profile?.username && profile.username !== "not set" ? profile.username : "No username set"}
          </Text>

          {profile?.email && (
            <Text className="text-white text-md mt-1 text-helvetica">{profile.email}</Text>
          )}

          {profile?.description && profile.description !== "not set" ? (
            <Text className="mt-4 text-white text-helvetica">{profile.description}</Text>
          ) : (
            <Text className="mt-3 text-white text-helvetica">No description set</Text>
          )}

          <Text className="text-gray-300 text-sm mt-1 text-helvetica">
            {followerCount} followers
          </Text>
        </View>

        {/* Right: Profile Picture */}
        <Pressable
          onPress={() => setShowModal2(true)}
          className="h-24 w-24 rounded-full items-center justify-center overflow-hidden bg-gray-500"
        >
          {profile?.profile_picture && profile.profile_picture !== "not set" ? (
            <Image
              source={{
                uri: profile.profile_picture,
                cache: 'reload'
              }}
              className="h-full w-full"
              resizeMode="cover"
              onError={() => {
                console.log("Image failed to load:", profile.profile_picture);
                setImageError(true);
              }}
              onLoad={() => {
                console.log("Image loaded successfully");
                setImageError(false);
              }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="person-add-outline" size={30} color="white" />
            </View>
          )}
        </Pressable>
      </View>

      {/* Edit Button */}
      <View className="items-center mt-12">
        <View className="bg-ymblue h-10 w-19/20 rounded-xl">
          <Pressable
            className="flex-1 items-center justify-center"
            onPress={() => setShowModal(true)}
          >
            <Text className="text-black font-bold text-xl text-helvetica">Edit Profile</Text>
          </Pressable>
        </View>
      </View>

      <ProfileModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          fetchProfile(); 
        }}
        profile={profile}
        setProfile={setProfile}
      />

      <PictureModal
        visible={showModal2}
        onClose={() => {
          setShowModal2(false);
          fetchProfile(); 
        }}
        setProfile={setProfile}
      />
    </>
  );
}

export default EditProfile;
