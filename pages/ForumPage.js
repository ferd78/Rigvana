// ForumPage.js
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  ScrollView,
} from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";

const FOR_YOU_POSTS = [
  {
    id: "1",
    username: "ISsmFailure",
    text: "Got a new build... Check it out!!!",
    imageUri: "https://i.imgur.com/qkdpN.jpg",
    likes: 2309,
    comments: 13,
    shares: 4,
    sends: 6,
  },
  {
    id: "2",
    username: "TechGuru",
    text: "Just upgraded my RAM to 64GB — never going back! 💪",
    // no imageUri here
    likes: 842,
    comments: 27,
    shares: 3,
    sends: 1,
  },
];

const FOLLOWING_POSTS = [

  // still empty for the “You haven’t followed any accounts” message
];

export default function ForumPage() {
  const [selectedTab, setSelectedTab] = useState("ForYou");
  const [newPost, setNewPost] = useState("");

  const postsToShow =
    selectedTab === "ForYou" ? FOR_YOU_POSTS : FOLLOWING_POSTS;

  return (
    <MainLayout>
      {/* Tabs */}
      <View className="flex-row px-4 mt-4 border-b border-gray-600">
        <Pressable
          onPress={() => setSelectedTab("ForYou")}
          className={
            "flex-1 items-center pb-2 " +
            (selectedTab === "ForYou" ? "border-b-2 border-white" : "")
          }
        >
          <Text className="text-white font-helvetica-bold">For you</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab("Following")}
          className={
            "flex-1 items-center pb-2 " +
            (selectedTab === "Following" ? "border-b-2 border-white" : "")
          }
        >
          <Text className="text-white font-helvetica-bold">Following</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4 mt-4">
        {/* only on “For you” */}
        {selectedTab === "ForYou" && (
          <>
            <View className="flex-row items-center mb-4">
              <Ionicons name="person-circle-outline" size={36} color="white" />
              <TextInput
                className="flex-1 ml-2 p-2 text-gray-400 font-helvetica bg-gray-800 rounded-lg"
                placeholder="@santoagd  Create new post..."
                placeholderTextColor="#888"
                value={newPost}
                onChangeText={setNewPost}
              />
            </View>
            <View className="flex-row justify-around mb-8">
              <Ionicons name="camera-outline" size={24} color="#888" />
              <Ionicons name="mic-outline" size={24} color="#888" />
              <Ionicons name="location-outline" size={24} color="#888" />
            </View>
          </>
        )}

        {/* empty‐state for Following */}
        {selectedTab === "Following" && postsToShow.length === 0 && (
          <View className="flex-1 justify-center items-center mt-20">
            <Text className="text-gray-400 font-helvetica">
              You haven’t followed any accounts
            </Text>
          </View>
        )}

        {/* feed */}
        {postsToShow.map((p, index) => (
  <React.Fragment key={p.id}>
    <View className="mb-8">
      <View className="flex-row items-center mb-2">
        <Ionicons
          name="person-circle-outline"
          size={36}
          color="white"
        />
        <Text className="ml-2 text-white font-helvetica-bold">
          @{p.username}
        </Text>
      </View>

      <Text className="text-white font-helvetica mb-2">{p.text}</Text>

      {p.imageUri && (
        <Image
          source={{ uri: p.imageUri }}
          className="w-full h-56 rounded-lg mb-2"
          resizeMode="cover"
        />
      )}

      <View className="flex-row justify-between px-2">
        <View className="flex-row items-center">
          <Ionicons name="heart-outline" size={20} color="#888" />
          <Text className="ml-1 text-gray-400 font-helvetica">
            {p.likes}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={20} color="#888" />
          <Text className="ml-1 text-gray-400 font-helvetica">
            {p.comments}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="repeat-outline" size={20} color="#888" />
          <Text className="ml-1 text-gray-400 font-helvetica">
            {p.shares}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="send-outline" size={20} color="#888" />
          <Text className="ml-1 text-gray-400 font-helvetica">
            {p.sends}
          </Text>
        </View>
      </View>
    </View>

    {/* separator between posts */}
    {index < postsToShow.length - 1 && (
      <View className="h-px bg-gray-700 opacity-30 my-4" />
    )}
  </React.Fragment>
))}

      </ScrollView>
    </MainLayout>
  );
}
