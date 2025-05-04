import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BackArrow from "../components/BackArrow";
import LogoutButton from "../components/LogoutButton";
import { useNavigation } from "@react-navigation/native";

function Settings() {
    const nav = useNavigation()

    return (
        <View className="bg-semiblack h-full">
            <View className="flex-row items-center gap-2 pt-6 pl-4">
                <BackArrow onPress={() => nav.navigate("MainTabs")}/>
                <Text className="text-white text-helvetica text-xl">
                    Settings
                </Text>
            </View>

            <View className="flex-1 justify-center items-center">
                <LogoutButton onPress={() => nav.navigate("Login")}/>
            </View>
         
        </View>
    );
}

export default Settings;