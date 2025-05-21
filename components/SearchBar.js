import { View, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function SearchBar({placeholder, onChangeText, value}){
    return (
        <View className="flex-row items-center h-11 rounded-full bg-zinc-700 px-4">
            <Ionicons name="search-outline" color="white" size={22} />
            <TextInput 
            placeholder={placeholder} 
            placeholderTextColor={"white"}
            className="w-4/5 text-white font-helvetica"
            onChangeText={onChangeText}
            value={value}
            style={{
            paddingVertical: 0,
            textAlignVertical: 'center', 
            includeFontPadding: false,
            }}/>
        </View>
    );
}

export default SearchBar;