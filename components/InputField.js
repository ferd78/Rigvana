import { View, TextInput, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

function InputField({ label, value, onChangeText, secureTextEntry }) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = label.toLowerCase().includes("password");

    return (
        <View className="flex-row w-5/6 h-13 bg-neutral-700 mt-6 items-center justify-between pl-3 pr-4 rounded-xl">
            <TextInput
                className="text-white font-helvetica flex-1"
                placeholder={label}
                placeholderTextColor="white"
                secureTextEntry={isPassword && !isPasswordVisible}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
            />
            {isPassword && (
                <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
                    <Ionicons
                        name={isPasswordVisible ? "eye" : "eye-off"}
                        size={20}
                        color="white"  
                    />
                </Pressable>
            )}
        </View>
    );
}

export default InputField;
