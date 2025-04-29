import { useNavigation } from "@react-navigation/native";
import { View, Text, SafeAreaView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Feather from '@expo/vector-icons/Feather';
import "../global.css";

function Home(){
    return (
        <View className="h-full bg-semiblack">
            <View className="pt-8 px-4 flex-row items-center justify-between">
                <Text className="text-ymblue font-jura-bold text-3xl tracking-widest">RIGVANA</Text>
                <View className="flex-row gap-3 items-center">
                    <Ionicons name="notifications-outline" color={"white"} size={24}/>
                    <Ionicons name="person-circle-outline" color={"white"} size={40}/>
                </View>
            </View>
            <View className="h-px w-screen bg-white mt-4"/>
            
            
        </View>
    );
}

export default Home;
