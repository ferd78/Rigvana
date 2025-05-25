import { useState } from "react";
import {
  Text,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import { GLOBAL_URL } from "../ipconfig";
import "../global.css";
import { setToken } from "../utils/auth";

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
        await setToken(data.token);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "android" ? 80 : 0}
      className="flex-1"
    >
      <ScrollView
        className="bg-semiblack"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="h-1/3 w-full justify-center items-center">
          <Text className="font-jura-bold text-ymblue text-7xl tracking-widest">
            RIGVANA
          </Text>
        </View>

        <View className="flex-1 items-center pt-8">
          {/* <Text className="font-helvetica-bold text-white text-4xl text-center pb-8">
            Login
          </Text> */}

          <InputField label="Email" value={email} onChangeText={setEmail} />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <View className="self-end pr-10 mt-4">
            <Text
              className="underline font-helvetica-bold text-white"
              onPress={() => nav.navigate("ForgotPassword")}
            >
              Forgot Password?
            </Text>
          </View>
          
          
          <LoginButton label="Login" className="" onPress={handleLogin} />

            
            
           <View className="items-center w-full mt-72 space-y-2">
            {/* <View className="h-px w-full bg-zinc-700 mb-5" /> */}

            <View className="flex-row">
              <Text className="text-white font-helvetica">
                Don't have an account? {""}
              </Text>
              <Text
                className="text-white underline font-helvetica-bold"
                onPress={() => nav.navigate("Register")}
              >
                Create One
              </Text>
            </View>
           
          </View>
         
          
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginPage;
