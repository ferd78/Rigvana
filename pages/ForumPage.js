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
} from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Audio } from "expo-av";
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
  const [newLocation, setNewLocation] = useState(null);
  const [recording, setRecording] = useState(null);
  const [newAudio, setNewAudio] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (repost) {
      setSelectedTab("ForYou");
      setNewText(`Repost from @${repost.username}: ${repost.text}`);
      setNewImage(repost.image_url || null);
      setNewLocation(repost.location || null);
      setNewAudio(repost.audio_url || null);
    }
  }, [repost]);

  useEffect(() => {
    fetchPosts();
  }, [selectedTab]);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/forum/posts`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const processed = data.map(p => ({
        ...p,
        created_at: new Date(p.created_at),
        commentsData: p.comments?.map(c => ({ ...c, created_at: new Date(c.created_at) })) || [],
        profile_picture_url: p.profile_picture_url || null,
      }));
      setPosts(processed);
    } catch {
      Alert.alert("Error", "Could not fetch posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = () => { setRefreshing(true); fetchPosts(); };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets?.length) setNewImage(res.assets[0].uri);
  };

  const fetchLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setNewLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      Alert.alert("Location error", e.message);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setNewAudio(recording.getURI());
      setRecording(null);
    } else {
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      setRecording(rec);
    }
  };

  async function uploadFile(uri, type) {
    const token = await getToken();
    const name = uri.split('/').pop();
    const form = new FormData();
    form.append('file', { uri, name, type: type==='image'?'image/jpeg':'audio/m4a' });
    const res = await fetch(`${GLOBAL_URL}/upload-profile-picture`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }, body: form });
    if (!res.ok) throw new Error();
    return (await res.json()).url;
  }

  const handlePost = async () => {
    if (!newText.trim()) 
      return Alert.alert("Error", "Post text is required");
    try {
      setUploading(true);
      const imgUrl = newImage && await uploadFile(newImage, 'image');
      const audUrl = newAudio && await uploadFile(newAudio, 'audio');
      const token = await getToken();
      const payload = 
      { text: newText, ...(imgUrl && { image_url: imgUrl }), 
      ...(audUrl && { audio_url: audUrl }), 
      ...(newLocation && { location: newLocation }) 
      };
      const res = await fetch(`${GLOBAL_URL}/forum/posts`, 
        { method: 'POST', 
          headers: { 
          Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, 
          body: JSON.stringify(payload) 
        });

      if (!res.ok) throw new Error();

      const np = await res.json();

      setPosts(prev => [{ ...np, liked: false, commentsData: [], profile_picture_url: np.profile_picture_url||null, created_at: new Date() }, ...prev]);
      
      setNewText(''); setNewImage(null); setNewAudio(null); setNewLocation(null);

      Alert.alert("Success", "Post created successfully");
    } catch {
      Alert.alert("Error", "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  const toggleForumLike = async id => {
    try {
      const token = await getToken();
      const res = await fetch(`${GLOBAL_URL}/forum/posts/${id}/like`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setPosts(prev => prev.map(p => p.id===id ? { ...p, liked:!p.liked, likes:d.likes } : p));
    } catch {
      Alert.alert("Error", "Failed to toggle like");
    }
  };

  const sharePost = async id => {
    try { await fetch(`${GLOBAL_URL}/forum/posts/${id}/share`, { method:'POST', headers:{ Authorization:`Bearer ${await getToken()}` } });
      setPosts(prev => prev.map(p => p.id===id ? { ...p, shares: p.shares+1 } : p));
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
        {['ForYou','Following'].map(tab=>(
          <Pressable key={tab} onPress={()=>setSelectedTab(tab)} className={`flex-1 items-center py-2 ${selectedTab===tab?'border-b-2 border-white':''}`}>
            <Text className={`${selectedTab===tab?'text-white font-bold':'text-gray-400'}`}>{tab==='ForYou'?'For you':'Following'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#9fcfff"]} tintColor="#9fcfff" />}
      >
        {selectedTab==='ForYou' && (
          <View className="my-4 p-3 bg-[#222] rounded-xl">
            <TextInput
              className="text-white min-h-[40px]"
              placeholder="What's on your mind?"
              placeholderTextColor="#888"
              value={newText}
              onChangeText={setNewText}
              multiline
            />
            <View className="flex-row mt-2">
              <Pressable onPress={pickImage} className="mr-4"><Ionicons name="camera-outline" size={24} color="#888"/></Pressable>
              <Pressable onPress={toggleRecording} className="mr-4">
                {recording?<ActivityIndicator color="#888"/>:<Ionicons name="mic-outline" size={24} color="#888"/>}
              </Pressable>
              <Pressable onPress={fetchLocation}><Ionicons name="location-outline" size={24} color="#888"/></Pressable>
            </View>
            {newImage && <Image source={{uri:newImage}} className="w-full h-48 rounded-xl mt-2" resizeMode="cover" />}
            {newAudio && <Text className="text-gray-300 mt-2">🎵 Recorded: {newAudio.split('/').pop()}</Text>}
            {newLocation && <Text className="text-gray-300 mt-2">📍 {newLocation.latitude.toFixed(4)}, {newLocation.longitude.toFixed(4)}</Text>}
            <Pressable onPress={handlePost} disabled={uploading} className="mt-3 bg-[#9fcfff] px-4 py-2 rounded-full items-center">
              {uploading?<ActivityIndicator color="#000"/>:<Text className="text-black font-bold">Post</Text>}
            </Pressable>
          </View>
        )}

        {selectedTab==='Following' && posts.length===0 && (
          <View className="flex-1 justify-center items-center mt-12">
            <Text className="text-gray-400">You haven't followed any accounts</Text>
          </View>
        )}

        {posts.map(p=> (
          <View key={p.id} className="mb-6 bg-[#222] rounded-xl p-4">
            <View className="flex-row justify-between">
              <View className="flex-row items-center">
                <Pressable onPress={()=>navigation.navigate('Profile',{userId:p.user_id})}>
                  {p.profile_picture_url?
                    <Image source={{uri:p.profile_picture_url}} className="w-9 h-9 rounded-full mr-2"/>
                    :<View className="w-9 h-9 rounded-full bg-gray-800 justify-center items-center mr-2"><Ionicons name="person-circle-outline" size={36} color="white"/></View>
                  }
                </Pressable>
                <Text className="text-white ml-2 font-bold">@{p.username}</Text>
              </View>
              <Pressable onPress={()=>navigation.navigate('Discussion',{post:p})}>
                <Text className="text-[#9fcfff] text-lg">💬</Text>
              </Pressable>
            </View>
            <Text className="text-white my-2">{p.text}</Text>
            {p.image_url && <Image source={{uri:p.image_url}} className="w-full h-48 rounded-xl" />}
            {p.audio_url && <AudioPlayer uri={p.audio_url}/>}            
            {p.location && <Text className="text-gray-300 mt-2">📍 {p.location.latitude.toFixed(4)}, {p.location.longitude.toFixed(4)}</Text>}
            {p.build_data && <View className="bg-gray-700 rounded-lg p-3 mt-2"><Text className="text-white font-bold text-base">{p.build_data.name}</Text><Text className="text-gray-300 text-sm mt-1">{p.build_data.description}</Text></View>}
            <View className="flex-row justify-around mt-2">
              <Pressable onPress={()=>toggleForumLike(p.id)} className="flex-row items-center"><Ionicons name={p.liked?"heart":"heart-outline"} size={20} color={p.liked?"red":"#888"} /><Text className="text-gray-400 ml-1">{p.likes}</Text></Pressable>
              <View className="flex-row items-center"><Ionicons name="chatbubble-outline" size={20} color="#888"/><Text className="text-gray-400 ml-1">{p.commentsData.length}</Text></View>
              <Pressable onPress={()=>sharePost(p.id)} className="flex-row items-center"><Ionicons name="share-social-outline" size={20} color="#888"/><Text className="text-gray-400 ml-1">{p.shares}</Text></Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </MainLayout>
  );
}

function AudioPlayer({ uri }) {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { return () => sound?.unloadAsync(); }, [sound]);

  const onToggle = async () => {
    if (!sound) {
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      s.setOnPlaybackStatusUpdate(st => st.didJustFinish && setPlaying(false));
      setSound(s);
      await s.playAsync();
      setPlaying(true);
    } else if (playing) {
      await sound.pauseAsync(); setPlaying(false);
    } else {
      await sound.playAsync(); setPlaying(true);
    }
  };

  return (
    <Pressable onPress={onToggle} className="flex-row items-center mt-2">
      <Ionicons name={playing?"pause-circle-outline":"play-circle-outline"} size={28} color="#888" />
      <Text className="text-gray-300 ml-2">{playing?"Playing...":"Play audio"}</Text>
    </Pressable>
  );
}

