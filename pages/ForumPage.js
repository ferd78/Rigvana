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
  StyleSheet,
} from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Audio } from "expo-av";

const INITIAL_FOR_YOU = [
  {
    id: "1",
    username: "ISsmFailure",
    text: "Got a new build... Check it out!!!",
    imageUri: "https://i.imgur.com/qkdpN.jpg",
    likes: 2309,
    commentsData: [
      { username: "santoagd", text: "Looks amazing!" },
      { username: "builder01", text: "Nice cable management." },
    ],
    shares: 4,
    sends: 6,
  },
  {
    id: "2",
    username: "TechGuru",
    text: "Just upgraded my RAM to 64GB — never going back! 💪",
    likes: 842,
    commentsData: [{ username: "ramfan", text: "How did you install them?" }],
    shares: 3,
    sends: 1,
  },
];

const FOLLOWING_POSTS = [];

export default function ForumPage() {
  const navigation = useNavigation();
  const route = useRoute();
  const repost = route.params?.repost;

  // Tab state
  const [selectedTab, setSelectedTab] = useState("ForYou");

  // Posts state
  const [posts, setPosts] = useState(
    INITIAL_FOR_YOU.map((p) => ({ ...p, liked: false }))
  );

  // New-post inputs
  const [newText, setNewText] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [newLocation, setNewLocation] = useState(null);
  const [recording, setRecording] = useState(null);
  const [newAudio, setNewAudio] = useState(null);

  // if we got a repost payload, prefill the composer
  useEffect(() => {
    if (repost) {
      setSelectedTab("ForYou");
      setNewText(`Repost from @${repost.username}: ${repost.text}`);
      setNewImage(repost.imageUri || null);
      setNewLocation(repost.location || null);
      setNewAudio(repost.audioUri || null);
    }
  }, [repost]);

  // ask permissions on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  // pick an image
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.length) {
        setNewImage(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert("Image error", e.message);
    }
  };

  // get current location
  const fetchLocation = async () => {
    try {
      let loc = await Location.getCurrentPositionAsync({});
      setNewLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      Alert.alert("Location error", e.message);
    }
  };

  // start/stop audio recording
  const toggleRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setNewAudio(uri);
      setRecording(null);
    } else {
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      setRecording(rec);
    }
  };

  // submit new post
  const handlePost = () => {
    if (!newText.trim() && !newImage && !newAudio && !newLocation) {
      Alert.alert("Empty Post", "Add text or an attachment.");
      return;
    }
    const newPost = {
      id: Math.random().toString(),
      username: "currentUser",
      text: newText,
      imageUri: newImage,
      audioUri: newAudio,
      location: newLocation,
      likes: 0,
      liked: false,
      commentsData: [],
      shares: 0,
      sends: 0,
    };
    setPosts((prev) => [newPost, ...prev]);
    // reset inputs
    setNewText("");
    setNewImage(null);
    setNewAudio(null);
    setNewLocation(null);
  };

  // toggle like on a forum post
  const toggleForumLike = (id) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
          : p
      )
    );

  const postsToShow = selectedTab === "ForYou" ? posts : FOLLOWING_POSTS;

  return (
    <MainLayout>
      {/* Tabs */}
      <View style={styles.tabs}>
        {["ForYou", "Following"].map((t) => (
          <Pressable
            key={t}
            onPress={() => setSelectedTab(t)}
            style={[styles.tab, selectedTab === t && styles.tabActive]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === t && styles.tabTextActive,
              ]}
            >
              {t === "ForYou" ? "For you" : "Following"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.container}>
        {/* New Post UI */}
        {selectedTab === "ForYou" && (
          <View style={styles.newPostBox}>
            <TextInput
              style={styles.newPostInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#888"
              value={newText}
              onChangeText={setNewText}
              multiline
            />

            <View style={styles.attachRow}>
              <Pressable onPress={pickImage} style={styles.attachBtn}>
                <Ionicons name="camera-outline" size={24} color="#888" />
              </Pressable>

              <Pressable onPress={toggleRecording} style={styles.attachBtn}>
                {recording ? (
                  <ActivityIndicator color="#888" />
                ) : (
                  <Ionicons name="mic-outline" size={24} color="#888" />
                )}
              </Pressable>

              <Pressable onPress={fetchLocation} style={styles.attachBtn}>
                <Ionicons name="location-outline" size={24} color="#888" />
              </Pressable>
            </View>

            {/* Previews */}
            {newImage && (
              <Image
                source={{ uri: newImage }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            )}
            {newAudio && (
              <Text style={styles.audioLabel}>
                🎵 Recorded: {newAudio.split("/").pop()}
              </Text>
            )}
            {newLocation && (
              <Text style={styles.audioLabel}>
                📍 {newLocation.latitude.toFixed(4)},{" "}
                {newLocation.longitude.toFixed(4)}
              </Text>
            )}

            <Pressable onPress={handlePost} style={styles.postBtn}>
              <Text style={styles.postBtnText}>Post</Text>
            </Pressable>
          </View>
        )}

        {/* Empty Following */}
        {selectedTab === "Following" && postsToShow.length === 0 && (
          <View style={styles.emptyFollowing}>
            <Text style={styles.emptyText}>
              You haven’t followed any accounts
            </Text>
          </View>
        )}

        {/* Feed */}
        {postsToShow.map((p) => (
          <View key={p.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.row}>
                <Ionicons
                  name="person-circle-outline"
                  size={36}
                  color="white"
                />
                <Text style={styles.username}>@{p.username}</Text>
              </View>
              <Pressable
                onPress={() =>
                  navigation.navigate("Discussion", {
                    post: p,
                    onComment: (c) => {
                      setPosts((prev) =>
                        prev.map((x) =>
                          x.id === p.id
                            ? { ...x, commentsData: [...x.commentsData, c] }
                            : x
                        )
                      );
                    },
                  })
                }
              >
                <Text style={styles.discussLink}>💬</Text>
              </Pressable>
            </View>

            <Text style={styles.postText}>{p.text}</Text>

            {/* Image */}
            {p.imageUri && (
              <Image source={{ uri: p.imageUri }} style={styles.postImage} />
            )}

            {/* Audio Player */}
            {p.audioUri && <AudioPlayer uri={p.audioUri} />}

            {/* Location */}
            {p.location && (
              <Text style={styles.audioLabel}>
                📍 {p.location.latitude.toFixed(4)},{" "}
                {p.location.longitude.toFixed(4)}
              </Text>
            )}

            <View style={styles.reactionsRow}>
              <Pressable onPress={() => toggleForumLike(p.id)} style={styles.row}>
                <Ionicons
                  name={p.liked ? "heart" : "heart-outline"}
                  size={20}
                  color={p.liked ? "red" : "#888"}
                />
                <Text style={styles.stat}>{p.likes}</Text>
              </Pressable>
              <View style={styles.row}>
                <Ionicons name="chatbubble-outline" size={20} color="#888" />
                <Text style={styles.stat}>{p.commentsData.length}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </MainLayout>
  );
}

// audio player subcomponent
function AudioPlayer({ uri }) {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(
    () => () => {
      if (sound) sound.unloadAsync();
    },
    [sound]
  );

  const onToggle = async () => {
    if (!sound) {
      const { sound: s } = await Audio.Sound.createAsync({ uri });
      s.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlaying(false);
      });
      setSound(s);
      await s.playAsync();
      setPlaying(true);
    } else if (playing) {
      await sound.pauseAsync();
      setPlaying(false);
    } else {
      await sound.playAsync();
      setPlaying(true);
    }
  };

  return (
    <Pressable onPress={onToggle} style={styles.audioPlayer}>
      <Ionicons
        name={playing ? "pause-circle-outline" : "play-circle-outline"}
        size={28}
        color="#888"
      />
      <Text style={styles.audioLabel}>
        {playing ? "Playing..." : "Play audio"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#555",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: "#fff" },
  tabText: { color: "#aaa", fontFamily: "Helvetica" },
  tabTextActive: { color: "#fff", fontFamily: "Helvetica-Bold" },

  container: { paddingHorizontal: 16 },
  newPostBox: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: "#222",
    borderRadius: 12,
  },
  newPostInput: { color: "#fff", fontFamily: "Helvetica", minHeight: 40 },
  attachRow: { flexDirection: "row", marginTop: 8 },
  attachBtn: { marginRight: 16 },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginTop: 8,
  },
  audioLabel: { color: "#ccc", marginTop: 8, fontFamily: "Helvetica" },
  postBtn: {
    marginTop: 12,
    backgroundColor: "#9fcfff",
    padding: 12,
    borderRadius: 24,
    alignItems: "center",
  },
  postBtnText: { color: "#000", fontFamily: "Helvetica-Bold" },

  emptyFollowing: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: { color: "#888", fontFamily: "Helvetica" },

  postCard: { marginBottom: 24 },
  postHeader: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center" },
  username: { color: "#fff", marginLeft: 8, fontFamily: "Helvetica-Bold" },
  discussLink: { color: "#9fcfff", fontSize: 18 },
  postText: { color: "#fff", marginVertical: 8, fontFamily: "Helvetica" },
  postImage: { width: "100%", height: 200, borderRadius: 12 },
  audioPlayer: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  reactionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  stat: { color: "#888", marginLeft: 4, fontFamily: "Helvetica" },
});
