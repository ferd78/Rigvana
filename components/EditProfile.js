import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import ProfileModal from "./ProfileModal";
import PictureModal from "./PictureModal";
import { Button } from "react-native";

function EditProfile(){
    const [showModal, setShowModal] = useState(false);
    const [showModal2, setShowModal2] = useState(false);
    return (
        <>
        <View className="flex-row justify-around gap-44 mt-4" >
            <View>
                <Text className="text-white text-xl text-helvetica font-bold">
                    (profile name)
                </Text>
                <Text className="text-white text-md ">
                    (email address)
                </Text>

                <Text className="mt-8 text-white text-helvetica">
                    (bio goes here)
                </Text>

                
            </View>

            <View className="h-16 w-16 bg-white rounded-full items-center justify-center">
                <Pressable onPress={() => setShowModal2(true)}>
                    <Ionicons name="person-add-outline" size={28} color={"black"}/>
                </Pressable>
            </View>         

            
        </View>

        <View className="items-center mt-24">
            <View className="bg-ymblue h-10 w-9/10 rounded-xl">
                <Pressable className="flex-1 items-center justify-center" onPress={() => setShowModal(true)}>
                    <Text className="text-black font-bold text-helvetica text-xl">Edit Profile</Text>
                </Pressable>
            </View>
        </View>

        
        <ProfileModal visible={showModal} onClose={() => setShowModal(false)} />
        <PictureModal visible={showModal2} onClose={() => setShowModal2(false)}/>
        {/* <Button title="Edit Profile" onPress={() => setShowModal(true)} /> */}
        

        </>
        
    );
}

export default EditProfile;