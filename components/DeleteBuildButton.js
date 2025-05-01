import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";

function DeleteBuildButton({onPress}) {
    return (
        <>
            <Pressable onPress={onPress}>
                <Ionicons name="trash" color="black" size={24}/>
            </Pressable>
        </>
    );
}

export default DeleteBuildButton;