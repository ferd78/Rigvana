import { Text, Pressable} from "react-native";

function LoginButton({label, onPress}){
    return (
        <>
        <Pressable onPress={onPress} className="w-5/6 bg-ymblue h-14 flex-row items-center justify-center rounded-full mt-14">
                <Text className="font-helvetica-bold text-lg">
                    {label}
                </Text>
        </Pressable>
        </>
    );
}

export default LoginButton;