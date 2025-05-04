import { Pressable} from "react-native";
import { Ionicons } from "@expo/vector-icons";

function BackArrow({onPress}) {
    return (
        <Pressable onPress={onPress}>
            <Ionicons name="arrow-back-outline" color={"white"} size={24}/>
        </Pressable>
       
    );
}

export default BackArrow;