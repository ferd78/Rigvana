import { Text, View, Pressable, Alert } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { useState } from "react";
import { NICO_URL } from "../ipconfig";
import { FELIX_URL } from "../ipconfig";
import { HARMAN_URL } from "../ipconfig";

function ForgotPassword(){
    const nav = useNavigation();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const handleContinue = async () => {
        if (!email) {
            setError("Please fill in the field first!");
            return;
        }
    
        if (!email.endsWith("@gmail.com")) {
            setError("Email must be a @gmail.com address!");
            return;
        }
    
        try {
            const response = await fetch(`${FELIX_URL}/request-password-reset`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
    
            if (!response.ok) {
                const data = await response.json();
                setError(data.detail || "Failed to send OTP.");
                return;
            }
    
            setError("");
            nav.navigate("Verification", { email }); 
        } catch (err) {
            setError("Error sending OTP. Try again.");
        }
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