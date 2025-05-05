import { View, Text, Modal, Pressable} from "react-native";
import { Ionicons } from "@expo/vector-icons";

function PictureModal({onClose, visible}) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
             <View className="flex-1 justify-center items-center bg-black/60">
                    <View className="w-1/3 p-6 bg-zinc-700 rounded-xl items-center">
                    <Pressable onPress={onClose} className="pb-4">
                        <Ionicons name="close-outline" color={"white"} size={24}/>
                    </Pressable>
                        <View className="h-16 w-16 bg-white rounded-full items-center justify-center mb-4">
                            <Ionicons name="person-add-outline" size={28} color={"black"}/>
                        </View>     
                        <View className="w-4/5 p-2 bg-black rounded-xl items-center justify-center">
                            <Text className="text-white font-bold text-helvetica">
                                New Picture?
                            </Text>
                        </View>
                    </View>
                  </View>
        </Modal>
    );
}

export default PictureModal;