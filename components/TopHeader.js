import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "../global.css";

function TopHeader(){
    return (
        <>
        <View className="pt-8 px-4 flex-row items-center justify-between">
                <Text className="text-ymblue font-jura-bold text-3xl tracking-widest">RIGVANA</Text>
                <View className="flex-row gap-3 items-center">
                    <Ionicons name="notifications-outline" color={"white"} size={28}/>
                    <Ionicons name="person-circle-outline" color={"white"} size={44}/>
                </View>
            </View>
            <View className="h-px w-screen bg-zinc-700 mt-4"/>
        </> 
    );
}

export default TopHeader;