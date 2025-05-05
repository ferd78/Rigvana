import { Modal, View, Text, TextInput, Button, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileModal({ visible, onClose }) {
  const [profileName, setProfileName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");

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
        
        <Text className="text-white text-helvetica">
            Username: (placeholder)
        </Text>
          <TextInput
            placeholder="Profile Name"
            placeholderTextColor={"white"}
            value={profileName}
            onChangeText={setProfileName}
            className="border border-white rounded px-3 py-2 mb-3 text-white"
          />

        <Text className="text-white text-helvetica">
            Email: (placeholder)
        </Text>
          <TextInput
            placeholder="Email Address"
            placeholderTextColor={"white"}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            className="border border-white rounded px-3 py-2 mb-3 text-white"
          />

        <Text className="text-white text-helvetica" >
            Bio: (Placeholder)
        </Text>
          <TextInput
            placeholder="Bio"
            placeholderTextColor={"white"}
            value={bio}
            onChangeText={setBio}
            multiline
            className="border border-white rounded px-3 py-2 h-24 text-start mb-3 text-white"
          />

          <View className="w-full items-center justify-center bg-ymblue h-10 rounded-xl">
            <Pressable onPress={onClose}>
                <Text className="text-helvetica font-bold">
                    Save
                </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}

