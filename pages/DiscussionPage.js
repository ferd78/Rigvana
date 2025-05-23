import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { v4 as uuidv4 } from 'uuid';
import { GLOBAL_URL } from "../ipconfig";
import { getToken } from '../utils/auth';
import 'react-native-get-random-values';

export default function DiscussionPage({ route }) {
  const navigation = useNavigation();
  const { post: initialPost, onComment } = route.params;
  const [userUid, setUserUid] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [postLikes, setPostLikes] = useState(initialPost.likes);
  const [postLiked, setPostLiked] = useState(initialPost.liked || false);

  const [comments, setComments] = useState(
    (initialPost.comments || []).map((c) => ({
      ...c,
      comment_id: c.comment_id || uuidv4(),
      likes: c.likes ?? 0,
      liked: c.liked_by?.includes(c.user_id) ?? false,
      replies: [],
      isReplying: false,
      replyText: "",
      created_at: new Date(c.created_at)
    }))
  );
  const [commentCount, setCommentCount] = useState(comments.length);

  const [newComment, setNewComment] = useState("");
  const [newImage, setNewImage] = useState(null);

  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const decoded = JSON.parse(atob(token.split('.')[1])); // decode Firebase JWT
      setUserUid(decoded.user_id); // or 'uid' depending on your backend
    })();
  }, []);

    const handleDeletePost = async () => {
    Alert.alert("Confirm", "Are you sure you want to delete this post?", [
      {
        text: "Cancel",
        style: "cancel"
      },
      {
        text: "Delete",
        onPress: async () => {
          try {
            const token = await getToken();
            const res = await fetch(`${GLOBAL_URL}/forum/posts/${initialPost.id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (!res.ok) throw new Error("Delete failed");

            Alert.alert("Deleted", "Post deleted successfully");
            navigation.goBack();
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete post");
          }
        }
      }
    ]);
  };

  const addComment = async (postId, text) => {
    try {
      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/forum/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to add comment');
      }

      const json = await response.json();
      return {
        ...json,
        created_at: new Date(json.created_at),
        replies: [],
        isReplying: false,
        replyText: "",
        liked: false,
        likes: 0,
      };
    } catch (error) {
      console.error('Comment error:', error.message);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!newComment.trim()) {
      Alert.alert("Error", "Comment text is required");
      return;
    }

    try {
      setSubmittingComment(true);

      const tempComment = {
        comment_id: uuidv4(),
        username: "currentUser",
        text: newComment,
        imageUri: newImage,
        likes: 0,
        liked: false,
        replies: [],
        created_at: new Date(),
        isReplying: false,
        replyText: "",
        profile_picture_url: null
      };

      setComments(prev => [...prev, tempComment]);
      setCommentCount(c => c + 1);
      setNewComment("");
      setNewImage(null);

      const addedComment = await addComment(initialPost.id, newComment);

      setComments(prev =>
        prev.map(c =>
          c.comment_id === tempComment.comment_id
            ? addedComment
            : c
        )
      );

      if (onComment) {
        onComment(addedComment.text);
      }
    } catch (error) {
      console.error("Comment error:", error);
      setComments(prev => prev.filter(c => c.comment_id !== tempComment.comment_id));
      setCommentCount(c => c - 1);
      Alert.alert("Error", error.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Need media library access to upload images");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setNewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const togglePostLike = async () => {
    try {
      const newLikedState = !postLiked;
      setPostLiked(newLikedState);
      setPostLikes(prev => prev + (newLikedState ? 1 : -1));

      const token = await getToken();
      const response = await fetch(`${GLOBAL_URL}/forum/posts/${initialPost.id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update like');
      }
    } catch (error) {
      setPostLiked(prev => !prev);
      setPostLikes(prev => prev + (postLiked ? 1 : -1));
      console.error("Like error:", error);
    }
  };

  const toggleCommentLike = async (commentId) => {
    setComments(prev =>
      prev.map(comment => {
        if (comment.comment_id === commentId) {
          const newLikedState = !comment.liked;
          return {
            ...comment,
            liked: newLikedState,
            likes: comment.likes + (newLikedState ? 1 : -1)
          };
        }
        return comment;
      })
    );
  };

  const toggleReplyInput = (commentId) => {
    setComments(prev =>
      prev.map(comment => {
        if (comment.comment_id === commentId) {
          return {
            ...comment,
            isReplying: !comment.isReplying,
            replyText: comment.isReplying ? "" : comment.replyText
          };
        }
        return comment;
      })
    );
  };

  const onChangeReplyText = (commentId, text) => {
    setComments(prev =>
      prev.map(comment => {
        if (comment.comment_id === commentId) {
          return { ...comment, replyText: text };
        }
        return comment;
      })
    );
  };

  const handleReplySend = async (commentId) => {
    const parentComment = comments.find(c => c.comment_id === commentId);
    if (!parentComment?.replyText.trim()) return;

    try {
      const tempReply = {
        comment_id: uuidv4(),
        username: "currentUser",
        text: parentComment.replyText,
        created_at: new Date(),
        parent_id: commentId,
        profile_picture_url: null
      };

      setComments(prev =>
        prev.map(comment => {
          if (comment.comment_id === commentId) {
            return {
              ...comment,
              replies: [...comment.replies, tempReply],
              isReplying: false,
              replyText: ""
            };
          }
          return comment;
        })
      );
      setCommentCount(c => c + 1);

      if (onComment) {
        onComment(tempReply);
      }
    } catch (error) {
      console.error("Reply error:", error);
      Alert.alert("Error", "Failed to post reply");
    }
  };

  const handleShare = async () => {
    const link = `https://rigvana.app/post/${initialPost.id}`;
    try {
      await Clipboard.setStringAsync(link);
      Alert.alert("Link copied to clipboard", link);
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
    }
  };

  return (
    <MainLayout>
      <View className="flex-row items-center justify-between p-4 border-b border-gray-800 bg-[#161010]">
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </Pressable>
        <Text className="text-white font-bold text-lg">Discussions</Text>
        <View className="w-7" />
      </View>

      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6 pb-4 border-b border-gray-800">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              {initialPost.profile_picture_url ? (
                <Image 
                  source={{ uri: initialPost.profile_picture_url }}
                  className="w-9 h-9 rounded-full bg-gray-700"
                />
              ) : (
                <View className="w-9 h-9 rounded-full bg-gray-900 justify-center items-center">
                  <Ionicons name="person" size={18} color="#666" />
                </View>
              )}
              <View className="ml-2">
                <Text className="text-white font-bold text-base">@{initialPost.username}</Text>
                <Text className="text-gray-500 text-xs mt-0.5">{new Date(initialPost.created_at).toLocaleString()}</Text>
              </View>
            </View>
            {userUid === initialPost.user_id && (
              <Pressable onPress={handleDeletePost}>
                <Ionicons name="trash-outline" size={24} color="#ff4c4c" />
              </Pressable>
            )}
          </View>

          <Text className="text-white text-base leading-6 my-3">{initialPost.text}</Text>
          {initialPost.image_url && (
            <Image
              source={{ uri: initialPost.image_url }}
              className="w-full h-64 rounded-xl mb-3"
            />
          )}

          <View className="flex-row items-center justify-between mt-3">
            <Pressable onPress={togglePostLike} className="flex-row items-center">
              <Ionicons
                name={postLiked ? "heart" : "heart-outline"}
                size={20}
                color={postLiked ? "red" : "#888"}
              />
              <Text className="text-gray-500 text-sm ml-1">{postLikes}</Text>
            </Pressable>

            <View className="flex-row items-center">
              <Ionicons name="chatbubble-outline" size={20} color="#888" />
              <Text className="text-gray-500 text-sm ml-1">{commentCount}</Text>
            </View>

            <Pressable onPress={() => navigation.navigate("Forum", { repost: initialPost })} className="flex-row items-center">
              <Ionicons name="repeat-outline" size={20} color="#9fcfff" />
              <Text className="text-[#9fcfff] font-bold ml-1">Repost</Text>
            </Pressable>

            <Pressable onPress={handleShare} className="px-2">
              <Ionicons name="send-outline" size={20} color="#9fcfff" />
            </Pressable>
          </View>
        </View>

        <Text className="text-white font-bold text-base mb-4">Comments ({commentCount})</Text>

        {comments.map(comment => (
          <View key={comment.comment_id} className="mb-4">
            <Text className="text-white font-semibold">@{comment.username}</Text>
            <Text className="text-gray-300">{comment.text}</Text>
            <Text className="text-gray-500 text-xs mt-1">{comment.created_at.toLocaleString()}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row items-center p-4 border-t border-gray-800 bg-[#161010] absolute bottom-0 left-0 right-0">
        <Pressable onPress={pickImage} className="p-2">
          <Ionicons name="camera-outline" size={24} color="white" />
        </Pressable>
        <TextInput
          className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 text-base max-h-30 mx-2"
          placeholder="Add a comment..."
          placeholderTextColor="#888"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <Pressable onPress={handleSend} className="p-2" disabled={!newComment.trim() || submittingComment}>
          {submittingComment ? (
            <ActivityIndicator size="small" color="#9fcfff" />
          ) : (
            <Ionicons 
              name="send" 
              size={24} 
              color={newComment.trim() ? "#9fcfff" : "#555"} 
            />
          )}
        </Pressable>
      </View>
    </MainLayout>
  );
}
