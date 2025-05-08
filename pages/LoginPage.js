import { useState } from "react";
import { Text, View, Alert } from "react-native";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { FELIX_URL, HARMAN_URL, GLOBAL_URL} from "../ipconfig";
import { NICO_URL } from "../ipconfig";
import "../global.css";
import { setToken } from '../utils/auth'; 

function LoginPage() {
    const nav = useNavigation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    

    const handleLogin = async () => {
        try {
          const response = await fetch(`${GLOBAL_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
      
          const data = await response.json();
      
          if (response.ok) {
            await setToken(data.token); // Use helper instead of direct AsyncStorage
            nav.navigate("MainTabs");
          } else {
            Alert.alert("Login Failed", data.detail || "Unknown error");
          }
        } catch (error) {
          console.error("Login error:", error);
          Alert.alert("Network Error", "Could not connect to backend.");
        }
      };

    return (
        <View className="h-full bg-semiblack">
            <View className="h-1/2 justify-center items-center">
                <Text className="font-jura-bold text-ymblue text-7xl tracking-widest">
                    RIGVANA
                </Text>
            </View>

            <View className="h-1/2 items-center pt-4">
                <Text className="font-helvetica-bold text-white text-4xl text-center pb-8">
                    Login
                </Text>

                <InputField label="Email" value={email} onChangeText={setEmail} />
                <InputField label="Password" value={password} onChangeText={setPassword} secureTextEntry />

                <View className="self-end pr-10 mt-2">
                    <Text className="underline font-helvetica-bold text-white" onPress={() => nav.navigate("ForgotPassword")}>
                        Forgot Password?
                    </Text>
                </View>

                <LoginButton label="Login" onPress={handleLogin} />

                <View className="flex-row pt-14">
                    <Text className="text-white font-helvetica">Don't have an account? </Text>
                    <Text className="text-white underline font-helvetica-bold" onPress={() => nav.navigate("Register")}>Create One</Text>
                </View>
            </View>
        </View>
    );
}

export default LoginPage;