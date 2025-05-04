import { View, Text } from "react-native";
import MainLayout from "../components/MainLayout";
import { Ionicons } from "@expo/vector-icons";

function ProfilePage() {
    return (
        <MainLayout>
            <View className="absolute top-24 right-3">
                {/* <Ionicons name="reorder-three-outline" color={"white"} size={34}/> */}
            </View>
        </MainLayout>
    );
}

export default ProfilePage;