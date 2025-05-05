// pages/DiscussionPage.js
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function DiscussionPage({ route }) {
  const navigation = useNavigation();
  const { post: initialPost, onComment } = route.params;

  // Post like state
  const [postLikes, setPostLikes] = useState(initialPost.likes);
  const [postLiked, setPostLiked] = useState(false);

  // Comments state (with replies)
  const [comments, setComments] = useState(
    (initialPost.commentsData || []).map((c) => ({
      ...c,
      likes: c.likes ?? 0,
      liked: false,
      replies: [],
      isReplying: false,
      replyText: "",
    }))
  );
  const [commentCount, setCommentCount] = useState(comments.length);

  // New‐comment inputs
  const [newComment, setNewComment] = useState("");
  const [newImage, setNewImage] = useState(null);

  // request permissions on mount
  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  // pick image for comment
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Permission to access media library is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled && result.assets?.length) {
      setNewImage(result.assets[0].uri);
    }
  };

  // send new top‐level comment
  const handleSend = () => {
    if (!newComment.trim() && !newImage) return;
    const newC = {
      username: "currentUser",
      text: newComment,
      imageUri: newImage,
      likes: 0,
      liked: false,
      replies: [],
      isReplying: false,
      replyText: "",
    };
    setComments((prev) => [...prev, newC]);
    setCommentCount((c) => c + 1);
    onComment && onComment(newC);
    setNewComment("");
    setNewImage(null);
  };

  // toggle like on the post
  const togglePostLike = () => {
    setPostLiked((prev) => {
      const liked = !prev;
      setPostLikes((pl) => pl + (liked ? 1 : -1));
      return liked;
    });
  };

  // toggle like on a comment
  const toggleCommentLike = (index) => {
    setComments((prev) => {
      const updated = [...prev];
      const c = updated[index];
      const liked = !c.liked;
      updated[index] = { ...c, liked, likes: c.likes + (liked ? 1 : -1) };
      return updated;
    });
  };

  // toggle reply input visibility
  const toggleReplyInput = (index) => {
    setComments((prev) => {
      const updated = [...prev];
      updated[index].isReplying = !updated[index].isReplying;
      if (!updated[index].isReplying) updated[index].replyText = "";
      return updated;
    });
  };

  // update reply text
  const onChangeReplyText = (index, text) => {
    setComments((prev) => {
      const updated = [...prev];
      updated[index].replyText = text;
      return updated;
    });
  };

  // send a reply to a comment
  const handleReplySend = (index) => {
    let replyObj;
    setComments((prev) => {
      const updated = [...prev];
      const parent = updated[index];
      replyObj = { username: "currentUser", text: parent.replyText };
      parent.replies.push(replyObj);
      parent.isReplying = false;
      parent.replyText = "";
      return updated;
    });
    setCommentCount((c) => c + 1);
    onComment && onComment(replyObj);
  };

  // share handler: copy post link to clipboard
  const handleShare = () => {
    const link = `https://rigvana.app/post/${initialPost.id}`;
    Alert.alert(
      "Share Post",
      link,
      [
        {
          text: "Copy Link",
          onPress: () => Clipboard.setStringAsync(link),
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
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

      <ScrollView contentContainerStyle={styles.container}>
        {/* Original Post */}
        <View style={styles.postBox}>
          <View style={[styles.row, styles.rowBetween, { marginBottom: 8 }]}>
            <View style={styles.row}>
              <Ionicons
                name="person-circle-outline"
                size={36}
                color="white"
              />
              <Text style={styles.username}>@{initialPost.username}</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </View>

          <Text style={styles.postText}>{initialPost.text}</Text>
          {initialPost.imageUri && (
            <Image
              source={{ uri: initialPost.imageUri }}
              style={styles.postImage}
            />
          )}

          <View style={[styles.row, styles.rowBetween]}>
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
        <Text style={styles.commentsTitle}>Comments</Text>
        {comments.map((c, i) => (
          <View key={i} style={styles.commentBox}>
            <View style={styles.row}>
              <Ionicons
                name="person-circle-outline"
                size={28}
                color="white"
              />
              <Text style={styles.username}>@{c.username}</Text>
            </View>
            <Text style={styles.commentText}>{c.text}</Text>
            {!!c.imageUri && (
              <Image
                source={{ uri: c.imageUri }}
                style={styles.commentImage}
                resizeMode="cover"
              />
            )}
            {c.replies.map((r, j) => (
              <View key={j} style={styles.replyBox}>
                <Text style={styles.replyUsername}>@{r.username}</Text>
                <Text style={styles.replyText}>{r.text}</Text>
              </View>
            ))}
            <View style={[styles.row, { marginTop: 8 }]}>
              <Pressable onPress={() => toggleCommentLike(i)} style={styles.row}>
                <Ionicons
                  name={c.liked ? "heart" : "heart-outline"}
                  size={20}
                  color={c.liked ? "red" : "#888"}
                />
                <Text style={styles.stat}>{c.likes}</Text>
              </Pressable>
              <Pressable
                onPress={() => toggleReplyInput(i)}
                style={{ marginLeft: 16 }}
              >
                <Text style={styles.replyButton}>Reply</Text>
              </Pressable>
            </View>
            {c.isReplying && (
              <View style={styles.replyInputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="Write a reply..."
                  placeholderTextColor="#888"
                  value={c.replyText}
                  onChangeText={(t) => onChangeReplyText(i, t)}
                />
                <Pressable
                  onPress={() => handleReplySend(i)}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons name="send-outline" size={24} color="white" />
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* New Comment Input */}
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment..."
          placeholderTextColor="#888"
          value={newComment}
          onChangeText={setNewComment}
        />
        <Pressable onPress={pickImage} style={styles.iconBtn}>
          <Ionicons name="camera-outline" size={24} color="white" />
        </Pressable>
        <Pressable onPress={handleSend} style={styles.iconBtn}>
          <Ionicons name="send-outline" size={24} color="white" />
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#444",
  },
  headerTitle: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 18,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  postBox: {
    marginBottom: 24,
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
  postText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginVertical: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  stat: {
    color: "#888",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginLeft: 4,
  },
  commentsTitle: {
    color: "#888",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginBottom: 12,
  },
  repostBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
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
  },
  commentText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 14,
    marginTop: 4,
  },
  commentImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    marginTop: 8,
  },
  replyBox: {
    marginTop: 8,
    marginLeft: 16,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: "#555",
  },
  replyUsername: {
    color: "#fff",
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
  },
  replyText: {
    color: "#fff",
    fontFamily: "Helvetica",
    fontSize: 13,
    marginTop: 2,
  },
  replyButton: {
    color: "#9fcfff",
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
  },
  replyInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#444",
    backgroundColor: "#161010",
  },
  input: {
    flex: 1,
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: "Helvetica",
  },
  iconBtn: {
    marginLeft: 12,
  },
});
