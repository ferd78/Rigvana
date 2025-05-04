import { View, Text, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackArrow from "../components/BackArrow";
import LogoutButton from "../components/LogoutButton";
import { useNavigation } from "@react-navigation/native";
import { HARMAN_URL } from "../ipconfig";
import { getToken, clearToken } from '../utils/auth';

function Settings() {
    const nav = useNavigation();

    const handleLogout = async () => {
        try {
            const token = await getToken();
            
            if (!token) {
                // No token found, just navigate to login
                nav.navigate("Login");
                return;
            }

            const response = await fetch(`${HARMAN_URL}/logout`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
            });

            if (response.ok) {
                await clearToken(); // Clear the token from storage
                nav.navigate("Login");
            } else {
                const data = await response.json();
                Alert.alert("Logout Failed", data.detail || "Could not logout properly");
            }
        } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Network Error", "Could not connect to backend. You've been logged out locally.");
            await clearToken(); // Clear token even if network fails
            nav.navigate("Login");
        }
    };

    return (
        <View className="bg-semiblack h-full">
            <View className="flex-row items-center gap-2 pt-6 pl-4">
                <BackArrow onPress={() => nav.navigate("MainTabs")}/>
                <Text className="text-white text-helvetica text-xl">
                    Settings
                </Text>
            </View>

            <View className="flex-1 justify-center items-center">
                <LogoutButton onPress={handleLogout}/>
            </View>
        </View>
    );
}

export default Settings;