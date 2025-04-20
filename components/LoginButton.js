import { View, Text, Pressable} from "react-native";

function LoginButton({label, onPress}){
    return (
        <View className="w-5/6 bg-ymblue h-14 flex-row items-center justify-center rounded-full mt-14">
            <Pressable onPress={onPress}>
                <Text className="font-helvetica-bold text-lg">
                    {label}
                </Text>
            </Pressable>
        </View>
    );
}

export default LoginButton;