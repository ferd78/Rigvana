import { Text, View, Pressable, Alert } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useState } from "react";
import { HARMAN_URL } from "../ipconfig";
import { NICO_URL } from "../ipconfig";


function SetNewPassword() {
    const nav = useNavigation();
    const route = useRoute();
    const { email, otp } = route.params;

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleReset = async () => {
        setError(""); // Clear previous error

        if (!password || password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            const response = await fetch(`${FELIX_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp, new_password: password }),
            });

            if (!response.ok) {
                const data = await response.json();
                Alert.alert("Error", data.detail || "Password reset failed.");
                return;
            }

            Alert.alert("Success", "Password updated!");
            nav.navigate("Login");
        } catch (err) {
            Alert.alert("Error", "Failed to reset password.");
        }
    };

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
                <InputField label="Password" onChangeText={setPassword} />
                <InputField label="Confirm Password" onChangeText={setConfirmPassword} />

                <LoginButton label="Continue" onPress={handleReset} /> 

                {error !== "" && (
                    <Text className="text-red-500 text-sm text-helvetica mt-4">{error}</Text>
                )}
            </View>
        </View>
    );
}

export default SetNewPassword;
