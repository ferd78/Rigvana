import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function RefreshButton({onPress}) {
    return (
        <View className="h-12 w-12 bg-almostblack rounded-2xl flex-row items-center justify-center" >
            <Pressable onPress={onPress}>
                <Ionicons name="refresh" size={34} color={"white"}/>
            </Pressable>
        </View>
    );
}

export default RefreshButton;