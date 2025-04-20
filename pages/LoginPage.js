import { Text, View } from "react-native";
import InputField from "../components/InputField";
import LoginButton from "../components/LoginButton";
import { useNavigation } from "@react-navigation/native";
import "../global.css";


function LoginPage(){
    const nav = useNavigation();
    
    return (
        <View className="h-screen bg-semiblack">
            <View className="h-1/2 justify-center items-center">
                <Text className="font-jura-bold text-ymblue text-7xl tracking-widest">
                    RIGVANA
                </Text>
            </View>
            
            <View className="h-1/2 items-center pt-4">
                <Text className="font-helvetica-bold text-white text-4xl text-center pb-8">
                    Login
                </Text>

                <InputField label="Email"/>
                <InputField label="Password"/>

                <View className="self-end pr-10 mt-2">
                    <Text className="underline font-helvetica-bold text-white">
                        Forgot Password?
                    </Text>
                </View>

                <LoginButton label="Login" onPress={() => nav.navigate("Home")}/>

                <View className="flex-row pt-14 ">
                    <Text className="text-white font-helvetica">Don't have an account? </Text>
                    <Text className="text-white underline font-helvetica-bold" onPress={() => nav.navigate("Register")}>Create One</Text>
                </View>    
            </View>    
        </View>
    );
}

export default LoginPage;