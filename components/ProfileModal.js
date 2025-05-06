import { Modal, View, Text, TextInput, Pressable, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { getToken } from '../utils/auth';
import { HARMAN_URL } from "../ipconfig";

export default function ProfileModal({ visible, onClose, profile, setProfile }) {
  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getToken();
      const response = await fetch(`${HARMAN_URL}/set-profile`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          description,
          profile_picture_url: profile?.profile_picture_url || ""
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Update local profile state
      setProfile({
        ...profile,
        name,
        description
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="w-11/12 p-4 bg-zinc-700 rounded-xl">
          <Pressable onPress={onClose}>
            <Ionicons name="close-outline" size={24} color={"white"}/>
          </Pressable>

          <Text className="text-lg font-bold mb-2 text-white text-helvetica font-bold">
            Edit Profile
          </Text>
          
          {error && (
            <Text className="text-red-500 mb-2">{error}</Text>
          )}

          <Text className="text-white text-helvetica">
            Username:
          </Text>
          <TextInput
            placeholder="Profile Name"
            placeholderTextColor={"white"}
            value={name}
            onChangeText={setName}
            className="border border-white rounded px-3 py-2 mb-3 text-white"
          />

          <Text className="text-white text-helvetica">
            Bio:
          </Text>
          <TextInput
            placeholder="Bio"
            placeholderTextColor={"white"}
            value={description}
            onChangeText={setDescription}
            multiline
            className="border border-white rounded px-3 py-2 h-24 text-start mb-3 text-white"
          />

          <View className="w-full items-center justify-center bg-ymblue h-10 rounded-xl">
            <Pressable 
              onPress={handleSave}
              disabled={loading}
              className="w-full items-center justify-center"
            >
              {loading ? (
                <ActivityIndicator color="black" />
              ) : (
                <Text className="text-helvetica font-bold">
                  Save
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}