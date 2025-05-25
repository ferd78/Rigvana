// pages/ForumPage.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal
} from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { GLOBAL_URL } from "../ipconfig";
import { getToken } from '../utils/auth';

export default function ForumPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const repost = route.params?.repost;

  const [selectedTab, setSelectedTab] = useState("ForYou");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newText, setNewText] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [buildPickerVisible, setBuildPickerVisible] = useState(false);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [userBuilds, setUserBuilds] = useState([]);

  useEffect(() => {
    if (repost) {
      setSelectedTab("ForYou");
      setNewText(`Repost from @${repost.username}: ${repost.text}`);
      setNewImage(repost.image_url || null);
    }
  }, [repost]);

  useEffect(() => {
    fetchPosts();
  }, [selectedTab]);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/forum/posts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = data.map(p => ({
        ...p,
        created_at: new Date(p.created_at),
        commentsData: p.comments?.map(c => ({ ...c, created_at: new Date(c.created_at) })) || [],
        profile_picture_url: p.profile_picture || null, // Changed from p.profile_picture_url to p.profile_picture
      }));
      setPosts(processed);
    } catch {
      Alert.alert("Error", "Could not fetch posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleBuildSelect = async (buildId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/get-certain-build/${buildId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch full build data");

      const fullBuild = await res.json();
      setSelectedBuild(fullBuild);
      setBuildPickerVisible(false);
    } catch (err) {
      console.error("Build fetch failed:", err);
      Alert.alert("Error", "Failed to load build data");
    }
  };

  useEffect(() => {
    loadBuilds();
  }, []);

  const loadBuilds = async () => {
    const token = await getToken();
    const res = await fetch(`${GLOBAL_URL}/get-builds`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUserBuilds(data);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    setNewText('');
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) setNewImage(res.assets[0].uri);
  };

  async function uploadFile(uri, type) {
    const token = await getToken();
    const name = uri.split('/').pop();
    const form = new FormData();
    form.append('file', { uri, name, type: type === 'image' ? 'image/jpeg' : 'audio/m4a' });
    const res = await fetch(`${GLOBAL_URL}/upload-profile-picture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      body: form,
    });
    if (!res.ok) throw new Error();
    return (await res.json()).url;
  }

  const handleResetPostInputs = async () => {
    setNewText("");
    setNewImage(null);
    setSelectedBuild(null);
  };

  const handlePost = async () => {
    if (!newText.trim()) {
      Alert.alert("Error", "Post text is required");
      return;
    }

    setUploading(true);

    try {
      const token = await getToken();

      const imgUrl = newImage ? await uploadFile(newImage, "image") : null;

      const payload = {
        text: newText,
        ...(imgUrl && { image_url: imgUrl }),
        ...(selectedBuild && { build_id: selectedBuild.id }),
      };

      const res = await fetch(`${GLOBAL_URL}/forum/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        console.error("POST failed:", msg);
        throw new Error("Failed to create post");
      }

      const np = await res.json();

      setPosts(prev => [
        {
          ...np,
          liked: false,
          commentsData: [],
          profile_picture_url: np.profile_picture || null, // Changed from np.profile_picture_url to np.profile_picture
          created_at: new Date(),
        },
        ...prev,
      ]);

      setNewText("");
      setNewImage(null);
      setSelectedBuild(null);

      Alert.alert("Success", "Post created successfully");

    } catch (err) {
      console.error("Post error:", err);
      Alert.alert("Error", err.message || "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const toggleForumLike = async id => {
    try {
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/forum/posts/${id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: d.likes } : p));
    } catch {
      Alert.alert("Error", "Failed to toggle like");
    }
  };

  const sharePost = async id => {
    try {
      await fetch(`${GLOBAL_URL}/forum/posts/${id}/share`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await getToken()}` },
      });
      setPosts(prev => prev.map(p => p.id === id ? { ...p, shares: p.shares + 1 } : p));
    } catch {
      Alert.alert("Error", "Failed to share post");
    }
  };

  if (loading && !refreshing) {
    return (
      <MainLayout>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#9fcfff" />
        </View>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <View className="flex-row mt-4 border-b border-gray-600">
        {['ForYou', 'Following'].map(tab => (
          <Pressable
            key={tab}
            onPress={() => setSelectedTab(tab)}
            className={`flex-1 items-center py-2 ${selectedTab === tab ? 'border-b-2 border-white' : ''}`}
          >
            <Text className={`${selectedTab === tab ? 'text-white font-bold' : 'text-gray-400'}`}>
              {tab === 'ForYou' ? 'For you' : 'Following'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9fcfff"]} tintColor="#9fcfff" />}
      >
        {selectedTab === 'ForYou' && (
          <View className="my-4 p-3 bg-[#222] rounded-xl">
            <TextInput
              className="text-white min-h-[40px]"
              placeholder="What's on your mind today?"
              placeholderTextColor="#888"
              value={newText}
              onChangeText={setNewText}
              multiline
            />
            <View className="flex-row mt-2">
              <Pressable onPress={pickImage} className="mr-4">
                <Ionicons name="camera-outline" size={24} color="#888" />
              </Pressable>
              
              <Pressable onPress={() => setBuildPickerVisible(true)} className="mr-4">
                <Ionicons name="albums-outline" size={24} color="#888" />
              </Pressable>

              <Pressable onPress={handleResetPostInputs} className="mr-4">
                <Ionicons name="close-outline" size={24} color="#888"/>
              </Pressable>
            </View>
            {newImage && <Image source={{ uri: newImage }} className="w-full h-48 rounded-xl mt-2" resizeMode="cover" />}
            <Pressable onPress={() => { handlePost(); handleResetPostInputs();}} onRefresh={onRefresh} disabled={uploading} className="mt-3 bg-[#9fcfff] px-4 py-2 rounded-full items-center">
              {uploading ? <ActivityIndicator color="#000" /> : <Text className="text-black font-bold">Post</Text>}
            </Pressable>

            {selectedBuild && (
              <Text className="text-white text-helvetica font-semibold mt-2">
                Selected Build: {selectedBuild.name}
              </Text>
            )}
          </View>
        )}

        {selectedTab === 'Following' && posts.length === 0 && (
          <View className="flex-1 justify-center items-center mt-12">
            <Text className="text-gray-400">You haven't followed any accounts</Text>
          </View>
        )}

        {posts.map(p => (
          <View key={p.id} className="mb-6 bg-[#222] rounded-xl p-4">
            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Pressable onPress={() => navigation.navigate('OtherProfile', { userId: p.user_id })}>
                  {p.profile_picture_url ? (
                    <Image 
                      source={{ uri: p.profile_picture_url }} 
                      className="w-9 h-9 rounded-full mr-2" 
                      onError={() => console.log("Failed to load profile picture")}
                    />
                  ) : (
                    <View className="w-9 h-9 rounded-full bg-gray-800 justify-center items-center mr-2">
                      <Ionicons name="person-circle-outline" size={36} color="white" />
                    </View>
                  )}
                </Pressable>
                <Text className="text-white ml-2 font-bold">@{p.username}</Text>
              </View>
              <Pressable onPress={() => navigation.navigate('Discussion', { post: p })}>
                <Text className="text-[#9fcfff] text-lg">💬</Text>
              </Pressable>
            </View>
            <Text className="text-white my-2">{p.text}</Text>
            {p.image_url && <Image source={{ uri: p.image_url }} className="w-full h-52 rounded-xl" />}
            {p.build_data && (
              <View className="bg-gray-700 rounded-lg p-3 mt-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-white font-bold text-base">{p.build_data.name}</Text>
                  <Text className="text-gray-300 text-sm mt-1">{p.build_data.description}</Text>
                </View>
                <Pressable
                  onPress={() => navigation.navigate("ViewPage", { 
                    buildId: p.build_id,
                    userId: p.user_id
                  })}
                  className=""
                >
                  <Ionicons name="eye-outline" size={24} color={"white"}/>
                </Pressable>
              </View>
            )}
            <View className="flex-row justify-around mt-2">
              <Pressable onPress={() => toggleForumLike(p.id)} className="flex-row items-center">
                <Ionicons name={p.liked ? "heart" : "heart-outline"} size={20} color={p.liked ? "red" : "#888"} />
                <Text className="text-gray-400 ml-1">{p.likes}</Text>
              </Pressable>
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">{p.commentsData.length}</Text>
              </View>
              <Pressable onPress={() => sharePost(p.id)} className="flex-row items-center">
                <Ionicons name="share-social-outline" size={20} color="#888" />
                <Text className="text-gray-400 ml-1">{p.shares}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal
        visible={buildPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBuildPickerVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-[#222] p-5 rounded-xl w-4/5 max-h-[60%]">
            <Text className="text-white text-lg font-bold mb-4">Choose from your builds: </Text>

            <ScrollView>
              {userBuilds.map((build) => (
                <Pressable
                  key={build.id}
                  onPress={() => {
                    setSelectedBuild(build);
                    setBuildPickerVisible(false);
                    loadBuilds();
                  }}
                  onRefresh={onRefresh}
                  className="bg-[#333] p-3 rounded-lg mb-2"
                >
                  <Text className="text-white font-bold">{build.name}</Text>
                  <Text className="text-gray-400 text-sm">{build.description}</Text>
                </Pressable>
              ))}
            </ScrollView>
            
            <View className="flex-row justify-between">
              <Pressable onPress={loadBuilds} className="mt-3 items-center">
                <Ionicons name="refresh-outline" size={28} color="white"/>
              </Pressable>
            
              <Pressable onPress={() => setBuildPickerVisible(false)} className="mt-3 items-center">
                <Ionicons name="close-circle-outline" size={30} color="white" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </MainLayout>
  );
}