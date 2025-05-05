import { View, Text } from "react-native";
import MainLayout from "../components/MainLayout";
import EditProfile from "../components/EditProfile";

function ProfilePage() {
    return (
        <MainLayout>
            <EditProfile/>
            
        </MainLayout>
    );
}

export default ProfilePage;