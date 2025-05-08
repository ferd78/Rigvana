import { View, Text, Pressable, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import ProfileModal from "./ProfileModal";
import PictureModal from "./PictureModal";
import { getToken } from '../utils/auth';
import { HARMAN_URL } from "../ipconfig";
import { GLOBAL_URL } from "../ipconfig";

function EditProfile() {
    const [showModal, setShowModal] = useState(false);
    const [showModal2, setShowModal2] = useState(false);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await getToken();
                const response = await fetch(`${GLOBAL_URL}/get-profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch profile');
                }
                
                const data = await response.json();
                console.log("Profile data:", data); // For debugging
                setProfile(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchProfile();
    }, []);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="text-white">{error}</Text>
            </View>
        );
    }

    return (
        <>
            <View className="flex-row justify-around gap-36 mt-4">
                <View>
                    {profile?.username && profile.username !== "not set" ? (
                        <Text className="text-white text-xl text-helvetica font-bold">
                            {profile.username}
                        </Text>
                    ) : (
                        <Text className="text-white text-xl text-helvetica font-bold">
                            No username set
                        </Text>
                    )}
                    
                    {profile?.email ? (
                        <Text className="text-white text-md">{profile.email}</Text>
                    ) : null}

                    {profile?.description && profile.description !== "not set" ? (
                        <Text className="mt-8 text-white text-helvetica">{profile.description}</Text>
                    ) : (
                        <Text className="mt-8 text-white text-helvetica">No description set</Text>
                    )}
                </View>

                <Pressable 
                    onPress={() => setShowModal2(true)}
                    className="h-16 w-16 rounded-full items-center justify-center overflow-hidden"
                >
                    {profile?.profile_picture && profile.profile_picture !== "not set" ? (
                        <Image
                            source={{ 
                                uri: profile.profile_picture,
                                cache: 'reload' // Force image reload
                            }}
                            className="h-full w-full"
                            resizeMode="cover"
                            onError={() => {
                                console.log("Image failed to load:", profile.profile_picture);
                                setImageError(true);
                            }}
                            onLoad={() => {
                                console.log("Image loaded successfully");
                                setImageError(false);
                            }}
                        />
                    ) : (
                        <View className="h-full w-full bg-gray-500 items-center justify-center">
                            <Ionicons name="person" size={28} color="white" />
                        </View>
                    )}
                </Pressable>    
            </View>

            <View className="items-center mt-24">
                <View className="bg-ymblue h-10 w-9/10 rounded-xl">
                    <Pressable 
                        className="flex-1 items-center justify-center" 
                        onPress={() => setShowModal(true)}
                    >
                        <Text className="text-black font-bold text-helvetica text-xl">Edit Profile</Text>
                    </Pressable>
                </View>
            </View>

            <ProfileModal 
                visible={showModal} 
                onClose={() => setShowModal(false)}
                profile={profile}
                setProfile={setProfile}
            />
            <PictureModal 
                visible={showModal2} 
                onClose={() => setShowModal2(false)}
                setProfile={setProfile}
            />



        </>
    );
}

export default EditProfile;