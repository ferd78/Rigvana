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

  // Loading states
  const [loading, setLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Post like state
  const [postLikes, setPostLikes] = useState(initialPost.likes);
  const [postLiked, setPostLiked] = useState(initialPost.liked || false);

  // Comments state (with replies)
  const [comments, setComments] = useState(
    (initialPost.comments || []).map((c) => ({
      ...c,
      comment_id: c.comment_id || uuidv4(),
      likes: c.likes ?? 0,
      liked: c.liked_by?.includes(c.user_id) ?? false,
      replies: [],
      isReplying: false,
      replyText: "",
      created_at: c.created_at ? new Date(c.created_at) : new Date()
    }))
  );
  const [commentCount, setCommentCount] = useState(comments.length);

  // New-comment inputs
  const [newComment, setNewComment] = useState("");
  const [newImage, setNewImage] = useState(null);

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

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

      return await response.json();
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
        profile_picture_url: null // Will be replaced by backend
      };

      setComments(prev => [...prev, tempComment]);
      setCommentCount(c => c + 1);
      setNewComment("");
      setNewImage(null);

      const addedComment = await addComment(initialPost.id, newComment);
      
      setComments(prev => prev.map(c => 
        c.comment_id === tempComment.comment_id 
          ? { 
              ...addedComment,
              replies: [],
              isReplying: false,
              replyText: "",
              created_at: new Date(addedComment.created_at)
            } 
          : c
      ));

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
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Discussion</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Original Post */}
        <View style={styles.postBox}>
          <View style={[styles.row, styles.rowBetween, { marginBottom: 8 }]}>
            <View style={styles.row}>
              {initialPost.profile_picture_url ? (
                <Image 
                  source={{ uri: initialPost.profile_picture_url }}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={18} color="#666" />
                </View>
              )}
              <View>
                <Text style={styles.username}>@{initialPost.username}</Text>
                <Text style={styles.postTime}>
                  {initialPost.created_at.toLocaleString()}
                </Text>
              </View>
            </View>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </View>

          <Text style={styles.postText}>{initialPost.text}</Text>
          
          {initialPost.image_url && (
            <Image
              source={{ uri: initialPost.image_url }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}

          <View style={[styles.row, styles.rowBetween, { marginTop: 12 }]}>
            {/* Like */}
            <Pressable onPress={togglePostLike} style={styles.row}>
              <Ionicons
                name={postLiked ? "heart" : "heart-outline"}
                size={20}
                color={postLiked ? "red" : "#888"}
              />
              <Text style={styles.stat}>{postLikes}</Text>
            </Pressable>

            {/* Comment Count */}
            <View style={styles.row}>
              <Ionicons name="chatbubble-outline" size={20} color="#888" />
              <Text style={styles.stat}>{commentCount}</Text>
            </View>

            {/* Repost */}
            <Pressable
              onPress={() =>
                navigation.navigate("Forum", { repost: initialPost })
              }
              style={styles.repostBtn}
            >
              <Ionicons
                name="repeat-outline"
                size={20}
                color="#9fcfff"
              />
              <Text style={styles.repostText}>Repost</Text>
            </Pressable>

            {/* Share */}
            <Pressable onPress={handleShare} style={styles.shareBtn}>
              <Ionicons name="send-outline" size={20} color="#9fcfff" />
            </Pressable>
          </View>
        </View>

        {/* Comments Section */}
        <Text style={styles.commentsTitle}>Comments ({commentCount})</Text>
        
        {comments.length === 0 ? (
          <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment.comment_id} style={styles.commentBox}>
              <View style={styles.row}>
                {comment.profile_picture_url ? (
                  <Image 
                    source={{ uri: comment.profile_picture_url }}
                    style={styles.commentProfileImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.commentProfileImagePlaceholder}>
                    <Ionicons name="person" size={14} color="#666" />
                  </View>
                )}
                <View style={styles.commentHeader}>
                  <Text style={styles.username}>@{comment.username}</Text>
                  <Text style={styles.commentTime}>
                    {comment.created_at.toLocaleString()}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.commentText}>{comment.text}</Text>
              
              {comment.imageUri && (
                <Image
                  source={{ uri: comment.imageUri }}
                  style={styles.commentImage}
                  resizeMode="cover"
                />
              )}

              {/* Replies */}
              {comment.replies.map((reply) => (
                <View key={reply.comment_id} style={styles.replyBox}>
                  <View style={styles.row}>
                    {reply.profile_picture_url ? (
                      <Image 
                        source={{ uri: reply.profile_picture_url }}
                        style={styles.replyProfileImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.replyProfileImagePlaceholder}>
                        <Ionicons name="person" size={12} color="#666" />
                      </View>
                    )}
                    <View>
                      <Text style={styles.replyUsername}>@{reply.username}</Text>
                      <Text style={styles.replyTime}>
                        {new Date(reply.created_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.replyText}>{reply.text}</Text>
                </View>
              ))}

              <View style={[styles.row, { marginTop: 8 }]}>
                <Pressable 
                  onPress={() => toggleCommentLike(comment.comment_id)} 
                  style={styles.row}
                >
                  <Ionicons
                    name={comment.liked ? "heart" : "heart-outline"}
                    size={20}
                    color={comment.liked ? "red" : "#888"}
                  />
                  <Text style={styles.stat}>{comment.likes}</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => toggleReplyInput(comment.comment_id)}
                  style={{ marginLeft: 16 }}
                >
                  <Text style={styles.replyButton}>Reply</Text>
                </Pressable>
              </View>

              {comment.isReplying && (
                <View style={styles.replyInputWrap}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor="#888"
                    value={comment.replyText}
                    onChangeText={(t) => onChangeReplyText(comment.comment_id, t)}
                    multiline
                  />
                  <Pressable
                    onPress={() => handleReplySend(comment.comment_id)}
                    style={styles.sendReplyButton}
                    disabled={!comment.replyText.trim()}
                  >
                    {submittingComment ? (
                      <ActivityIndicator size="small" color="#9fcfff" />
                    ) : (
                      <Ionicons name="send" size={24} color="#9fcfff" />
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* New Comment Input */}
      <View style={styles.inputWrap}>
        <Pressable onPress={pickImage} style={styles.iconBtn}>
          <Ionicons name="camera-outline" size={24} color="white" />
        </Pressable>
        
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#888"
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        
        <Pressable 
          onPress={handleSend} 
          style={styles.iconBtn}
          disabled={!newComment.trim() || submittingComment}
        >
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: '#161010',
  },
  headerTitle: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  postBox: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    justifyContent: "space-between",
  },
  username: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginLeft: 8,
  },
  postTime: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
    fontFamily: 'Helvetica',
  },
  postText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 16,
    marginVertical: 12,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
  },
  profileImagePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stat: {
    color: "#888",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginLeft: 4,
  },
  commentsTitle: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    marginBottom: 16,
  },
  noCommentsText: {
    color: '#888',
    fontFamily: 'Helvetica',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
  },
  repostBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  repostText: {
    color: "#9fcfff",
    marginLeft: 8,
    fontFamily: "Helvetica-Bold",
  },
  shareBtn: {
    paddingHorizontal: 8,
  },
  commentBox: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#222',
    borderRadius: 12,
  },
  commentHeader: {
    marginLeft: 8,
  },
  commentProfileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
  },
  commentProfileImagePlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 15,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 20,
  },
  commentTime: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  commentImage: {
    width: "100%",
    height: 180,
    borderRadius: 8,
    marginTop: 8,
  },
  replyBox: {
    marginTop: 12,
    marginLeft: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#444",
  },
  replyProfileImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  replyProfileImagePlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyUsername: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginLeft: 8,
  },
  replyTime: {
    color: '#888',
    fontSize: 11,
    marginLeft: 8,
    fontFamily: 'Helvetica',
  },
  replyText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginTop: 4,
    marginLeft: 36,
  },
  replyButton: {
    color: "#9fcfff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  replyInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 14,
    maxHeight: 100,
  },
  sendReplyButton: {
    marginLeft: 8,
    padding: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    backgroundColor: "#161010",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: "Helvetica",
    fontSize: 15,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  iconBtn: {
    padding: 8,
  },
});