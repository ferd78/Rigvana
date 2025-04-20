import { View, TextInput, Pressable} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

function InputField({label}) {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const isPassword = label.toLowerCase().includes("password");


    return (
      <View className="flex-row w-5/6 h-13 bg-neutral-700 mt-6 items-center justify-between pl-3 pr-4 rounded-xl">
        <TextInput 
        className="text-white font-helvetica"
        placeholder={label}
        secureTextEntry={isPassword && !isPasswordVisible}
        placeholderTextColor="white"
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