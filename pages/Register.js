import { Text, View, Pressable } from "react-native";
import "../global.css";
import { Ionicons } from "@expo/vector-icons";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";

function Register(){
    const nav = useNavigation()

    return (
        <View className="h-screen bg-semiblack">
             <View className="flex-row items-center justify-center relative mt-14 ">
                <Pressable onPress={() => nav.navigate("Login")} className="absolute left-10">
                    <Ionicons name="arrow-back" color={"white"} size={28}/>
                </Pressable>
                <Text className="text-helvetica-bold text-white text-4xl">
                    Create Account
                </Text>
             </View>

            <View className="items-center pt-8">
                <InputField label="Email"/>
                <InputField label="Password"/>
                <InputField label="Confirm Password"/>
                <LoginButton label="Create Account"/>
            </View>
        </View>
    );
}

export default Register;



  