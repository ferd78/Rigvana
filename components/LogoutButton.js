import { Pressable, View, Text} from "react-native";

function LogoutButton({onPress}) {
    return (
        <Pressable onPress={onPress}>
            <View className="rounded-xl items-center justify-center">
                <Text className="text-red-500 font-helvetica font-bold text-xl">
                    Log out
                </Text>
            </View>
        </Pressable>
    );
}

export default LogoutButton;