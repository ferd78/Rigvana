import { Text, View, Pressable, Alert } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";


function ForgotPassword(){
    const nav = useNavigation();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const handleContinue = () => {
        if(!email){
            setError("Please fill in the field first!")
            return
        }

        if (!email.endsWith("@gmail.com")) {
            setError("Email must be a @gmail.com address!");
            return;
        }

        setError("")
        nav.navigate("Verification")
    };

    return (
        <View className="h-full bg-semiblack">
            <View className="flex-row items-center justify-center relative mt-14">
                <Pressable onPress={() => nav.navigate("Login")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28} />
                </Pressable>
                <Text className="text-helvetica-bold text-white text-4xl">
                    Forgot Password?
                </Text>
                
            </View>

            <View className="items-center pt-12">
                <Text className="text-helvetica text-white text-md">
                    Enter your email address:
                </Text>
                <InputField label="Email" onChangeText={(text) => setEmail(text.toLowerCase())}/>
                <LoginButton label="Continue" onPress={handleContinue}/> 
                {error !== "" && (
                    <Text className="text-red-500 text-sm text-helvetica mt-4">{error}</Text>
                )}
            </View>
        </View>
    )
}

export default ForgotPassword;