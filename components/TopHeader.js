import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import "../global.css";

function TopHeader(){
    const nav = useNavigation();
    const route = useRoute();
    const showUnderline = route.name !== "Forum";
    return (
        <>
        <View className="pt-8 px-4 flex-row items-center justify-between">
                <Text className="text-ymblue font-jura-bold text-3xl tracking-widest">RIGVANA</Text>
                <View className="flex-row gap-3 items-center">
                    <Pressable>
                        <Ionicons name="notifications-outline" color={"white"} size={28}/>
                    </Pressable>
                    <Pressable onPress={() => nav.navigate("Settings")}>
                        <Ionicons name="settings-outline" color={"white"} size={32}/>
                    </Pressable>
                </View>
            </View>
            {showUnderline && (
                <View className="h-px w-screen bg-zinc-700 mt-4"/>
            )}
            
        </> 
    );
}

export default TopHeader;