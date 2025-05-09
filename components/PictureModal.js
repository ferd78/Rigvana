import { Modal, View, Text, Pressable, ActivityIndicator, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { getToken } from '../utils/auth';
import { HARMAN_URL, GLOBAL_URL } from "../ipconfig";
import { useState } from "react";

export default function PictureModal({ visible, onClose, setProfile }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const testConnection = async () => {
        try {
          const response = await fetch(`${GLOBAL_URL}/`);
          console.log('Connection test:', await response.text());
        } catch (error) {
          console.error('Connection test failed:', error);
        }
    };
    
    testConnection();
    
    const pickImage = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Permission to access media library was denied');
            }
    
            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
    
            if (result.canceled || !result.assets || result.assets.length === 0) {
                return;
            }
    
            const token = await getToken();
            const uri = result.assets[0].uri;
            const type = 'image/jpeg';
            const name = 'profile.jpg';
    
            const formData = new FormData();
            formData.append('file', {
                uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                name: name,
                type: type
            });
    
            console.log('FormData:', {
                uri: uri,
                type: type,
                name: name,
                platform: Platform.OS
            });
    
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
    
            const uploadResponse = await fetch(`${GLOBAL_URL}/upload-profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                body: formData,
                signal: controller.signal
            });
    
            clearTimeout(timeout);
    
            const responseText = await uploadResponse.text();
            console.log('Upload response:', responseText);
    
            if (!uploadResponse.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { detail: responseText };
                }
                throw new Error(errorData.detail || 'Upload failed with status: ' + uploadResponse.status);
            }
    
            const { url } = JSON.parse(responseText);
            
            const updateResponse = await fetch(`${GLOBAL_URL}/update-profile-picture`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    profile_picture_url: url
                })
            });
    
            if (!updateResponse.ok) {
                throw new Error('Failed to update profile');
            }
    
            setProfile(prev => ({
                ...prev,
                profile_picture: url
            }));
    
            onClose();
        } catch (err) {
            console.error('Full error details:', {
                message: err.message,
                name: err.name,
                stack: err.stack
            });
            setError(err.message || 'Failed to upload image');
        } finally {
            setLoading(false);
        }
    };

    const deleteProfilePicture = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = await getToken();
            const response = await fetch(`${GLOBAL_URL}/delete-profile-picture`, {
                method: "POST",
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete profile picture');
            }

            setProfile(prev => ({
                ...prev,
                profile_picture: "not set"
            }));

            onClose();
        } catch (err) {
            console.error('Error deleting profile picture:', err);
            setError(err.message || 'Failed to delete profile picture');
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

                    <Text className="text-lg font-bold mb-4 text-white text-helvetica font-bold">
                        Update Profile Picture:
                    </Text>

                    {error && (
                        <Text className="text-red-500 mb-4">{error}</Text>
                    )}

                    <View className="items-center space-y-4">
                        <Pressable 
                            className="bg-ymblue px-6 py-3 rounded-xl"
                            onPress={pickImage}
                            
                        >
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text className="text-black font-bold">Choose from Gallery</Text>
                            )}
                        </Pressable>

                        <Pressable 
                            className="bg-red-500 px-6 py-3 mt-3 rounded-xl" 
                            onPress={deleteProfilePicture}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold font-helvetica">
                                    Delete
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}