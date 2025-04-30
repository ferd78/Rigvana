import { useState } from "react";
import { Text, View, Pressable, Alert } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { FELIX_URL } from "../ipconfig";
import { HARMAN_URL } from "../ipconfig";


function Register() {
    const nav = useNavigation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            Alert.alert("Password Mismatch", "Passwords do not match.");
            return;
        }

        try {
            const response = await fetch(`${FELIX_URL}/signup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                Alert.alert("Account Created", "You can now log in.");
                nav.navigate("Login");
            } else {
                Alert.alert("Registration Failed", data.detail || "Unknown error");
            }
        } catch (error) {
            console.error("Registration error:", error);
            Alert.alert("Network Error", "Could not connect to backend.");
        }
    };

    return (
        <View className="h-full bg-semiblack">
            <View className="flex-row items-center justify-center relative mt-14">
                <Pressable onPress={() => nav.navigate("Login")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28} />
                </Pressable>
                <Text className="text-helvetica-bold text-white text-4xl">
                    Create Account
                </Text>
            </View>

            <View className="items-center pt-8">
                <InputField label="Email" value={email} onChangeText={setEmail} />
                <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />
                <InputField label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
                <LoginButton label="Create Account" onPress={handleRegister} />
            </View>
        </View>
    );
}



export default Register;
