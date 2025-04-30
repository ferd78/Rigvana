import { Text, View, Pressable, Alert } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";

function SetNewPassword() {
    const nav = useNavigation();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const handleContinuation = () => {
        if(password !== confirmPassword){
            setError("Passwords do not match!")
            return
        }

        if(!password || !confirmPassword){
            setError("Please fill in both fields!")
            return
        }

        setError("")
        nav.navigate("Login")
    }

    return (
        <View className="h-full bg-semiblack">
            <View className="flex-row items-center justify-center relative mt-14">
                <Pressable onPress={() => nav.navigate("Verification")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28} />
                </Pressable>
                <Text className="text-helvetica-bold text-white text-4xl">
                    Set New Password
                </Text>
                
            </View>

            <View className="items-center pt-12">
                <Text className="text-helvetica text-white text-md">
                    Enter new password:
                </Text>
                <InputField label="Password" onChangeText={(text) => setPassword(text)}/>
                <InputField label="Confirm Password" onChangeText={(text) => setConfirmPassword(text)}/>


                <LoginButton label="Continue" onPress={handleContinuation}/> 

            
                {error !== "" && (
                    <Text className="text-red-500 text-sm text-helvetica mt-4">{error}</Text>
                )}
            </View>
        </View>
    );
}


export default SetNewPassword;