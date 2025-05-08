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
  RefreshControl,
} from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Audio } from "expo-av";
import { HARMAN_URL, GLOBAL_URL } from "../ipconfig";
import { getToken } from '../utils/auth';
import * as FileSystem from 'expo-file-system';

const ForumPage = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const repost = route.params?.repost;

  // Tab state
  const [selectedTab, setSelectedTab] = useState("ForYou");
  // Posts state
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // New-post inputs
  const [newText, setNewText] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [newLocation, setNewLocation] = useState(null);
  const [recording, setRecording] = useState(null);
  const [newAudio, setNewAudio] = useState(null);
  const [uploading, setUploading] = useState(false);

  // if we got a repost payload, prefill the composer
  useEffect(() => {
    if (repost) {
      setSelectedTab("ForYou");
      setNewText(`Repost from @${repost.username}: ${repost.text}`);
      setNewImage(repost.image_url || null);
      setNewLocation(repost.location || null);
      setNewAudio(repost.audio_url || null);
    }
  }, [repost]);

  // Fetch posts on mount and when tab changes
  useEffect(() => {
    fetchPosts();
  }, [selectedTab]);

  // ask permissions on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      await Location.requestForegroundPermissionsAsync();
      await Audio.requestPermissionsAsync();
    })();
  }, []);

  const fetchPosts = async () => {
    try {
        setLoading(true);
        const token = await getToken();
        const response = await fetch(`${GLOBAL_URL}/forum/posts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch posts');
        }

        const data = await response.json();
        
        // Parse ISO date strings back to Date objects if needed
        const processedPosts = data.map(post => ({
            ...post,
            created_at: new Date(post.created_at),
            commentsData: post.comments?.map(comment => ({
                ...comment,
                created_at: new Date(comment.created_at)
            })) || [],
            // Ensure profile_picture_url exists, fallback to null
            profile_picture_url: post.profile_picture_url || null
        }));

        setPosts(processedPosts);
    } catch (error) {
        console.error('Error fetching posts:', error.message);
        Alert.alert("Error", "Could not fetch posts");
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

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

  const uploadFile = async (uri, fileType) => {
    try {
      const token = await getToken();
      const filename = uri.split('/').pop();
      const formData = new FormData();
      
      // For React Native, we need to modify the file object
      formData.append('file', {
        uri,
        name: filename,
        type: fileType === 'image' ? 'image/jpeg' : 'audio/m4a',
      });

      const response = await fetch(`${GLOBAL_URL}/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // submit new post
  const handlePost = async () => {
    // Validate at least text exists
    if (!newText.trim()) {
      Alert.alert("Error", "Post text is required");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = null;
      let audioUrl = null;

      // Upload files if they exist
      if (newImage) {
        imageUrl = await uploadFile(newImage, 'image');
      }
      if (newAudio) {
        audioUrl = await uploadFile(newAudio, 'audio');
      }

      const token = await getToken();
      const postData = {
        text: newText,
      };

      // Only include optional fields if they exist
      if (imageUrl) postData.image_url = imageUrl;
      if (audioUrl) postData.audio_url = audioUrl;
      if (newLocation) postData.location = newLocation;
      // build_id would be added here if you implement that feature

      const response = await fetch(`${GLOBAL_URL}/forum/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const newPost = await response.json();
      
      // Add to local state
      setPosts(prev => [{
        ...newPost,
        liked: false,
        commentsData: [],
        profile_picture_url: newPost.profile_picture_url || null,
        created_at: new Date()
      }, ...prev]);

      // Reset form
      setNewText("");
      setNewImage(null);
      setNewAudio(null);
      setNewLocation(null);
      
      Alert.alert("Success", "Post created successfully");
    } catch (error) {
      console.error('Post error:', error);
      Alert.alert("Error", "Failed to create post");
    } finally {
      setUploading(false);
    }
  };

  // toggle like on a forum post
  const toggleForumLike = async (postId) => {
    try {
      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/forum/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      
      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              liked: !post.liked,
              likes: data.likes,
              liked_by: data.liked 
                ? [...(post.liked_by || []), post.user_id] 
                : (post.liked_by || []).filter(id => id !== post.user_id)
            } 
          : post
      ));
    } catch (error) {
      console.error('Like error:', error);
      Alert.alert("Error", "Failed to toggle like");
    }
  };

  const addComment = async (postId, text) => {
    try {
      // Validate input is a string
      if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Comment text is required');
      }
  
      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }), // Send only the text
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to add comment');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Comment error:', error.message);
      throw error;
    }
  };

  const sharePost = async (postId) => {
    try {
      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/forum/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to share post');
      }

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              shares: post.shares + 1 
            } 
          : post
      ));
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert("Error", "Failed to share post");
    }
  };

  if (loading && !refreshing) {
    return (
      <MainLayout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9fcfff" />
        </View>
      </MainLayout>
    );
  }

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

      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#9fcfff"]}
            tintColor="#9fcfff"
          />
        }
      >
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

            <Pressable 
              onPress={handlePost} 
              style={styles.postBtn}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.postBtnText}>Post</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Empty Following */}
        {selectedTab === "Following" && posts.length === 0 && (
          <View style={styles.emptyFollowing}>
            <Text style={styles.emptyText}>
              You haven't followed any accounts
            </Text>
          </View>
        )}

        {/* Feed */}
        {posts.map((p) => (
          <View key={p.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.row}>
                <Pressable onPress={() => navigation.navigate('Profile', { userId: p.user_id })}>
                  {p.profile_picture_url ? (
                    <Image 
                      source={{ uri: p.profile_picture_url }}
                      style={styles.profileImage}
                      onError={() => console.log("Failed to load profile image")}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Ionicons
                        name="person-circle-outline"
                        size={36}
                        color="white"
                      />
                    </View>
                  )}
                </Pressable>
                <Text style={styles.username}>@{p.username}</Text>
              </View>
              <Pressable
                onPress={() =>
                  navigation.navigate("Discussion", {
                    post: p,
                    onComment: async (text) => {
                      try {
                        const newComment = await addComment(p.id, text);
                        return newComment;
                      } catch (error) {
                        Alert.alert("Error", "Failed to add comment");
                        return null;
                      }
                    },
                  })
                }
              >
                <Text style={styles.discussLink}>💬</Text>
              </Pressable>
            </View>

            <Text style={styles.postText}>{p.text}</Text>

            {/* Image */}
            {p.image_url && (
              <Image source={{ uri: p.image_url }} style={styles.postImage} />
            )}

            {/* Audio Player */}
            {p.audio_url && <AudioPlayer uri={p.audio_url} />}

            {/* Location */}
            {p.location && (
              <Text style={styles.audioLabel}>
                📍 {p.location.latitude.toFixed(4)},{" "}
                {p.location.longitude.toFixed(4)}
              </Text>
            )}

            {/* Build reference */}
            {p.build_data && (
              <View style={styles.buildPreview}>
                <Text style={styles.buildTitle}>{p.build_data.name}</Text>
                <Text style={styles.buildDesc}>{p.build_data.description}</Text>
              </View>
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
              
              <Pressable onPress={() => sharePost(p.id)} style={styles.row}>
                <Ionicons name="share-social-outline" size={20} color="#888" />
                <Text style={styles.stat}>{p.shares}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </MainLayout>
  );
};

// Audio player subcomponent
const AudioPlayer = ({ uri }) => {
  const [sound, setSound] = useState(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onToggle = async () => {
    if (!sound) {
      const { sound: newSound } = await Audio.Sound.createAsync({ uri });
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlaying(false);
      });
      setSound(newSound);
      await newSound.playAsync();
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
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#555",
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  profileImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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

  postCard: { 
    marginBottom: 24,
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
  },
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buildPreview: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  buildTitle: {
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
  },
  buildDesc: {
    color: '#ccc',
    fontFamily: 'Helvetica',
    fontSize: 14,
    marginTop: 4,
  },
});

export default ForumPage;