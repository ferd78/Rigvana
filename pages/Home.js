import { View, Text, SafeAreaView, ScrollView } from "react-native";
import "../global.css";
import MainLayout from "../components/MainLayout";
import AddNewButton from "../components/AddNewButton";
import DeleteBuildButton from "../components/DeleteBuildButton";
import { useState } from "react";

function Home(){
    const [pcBuilds, setPcBuilds] = useState("");
    const handleAddBuild = () => {
        const newBuild = {
            name: "My Gaming PC",
            description: "Ryzen 5 + GTX 1080TI setup"
        };
        setPcBuilds(prev => [...prev, newBuild])
    };

    const handleDeleteBuild = (indexToDelete) => {
        setPcBuilds(prev => prev.filter((_, index) => index !== indexToDelete))
    }

    return (
        <MainLayout>
            <View className="flex-1">
                {pcBuilds.length === 0 ? (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-helvetica text-white text-lg">No builds yet!</Text>
                    </View>
                ) : (
                <ScrollView className="w-5/6 self-center mt-6">
                {pcBuilds.map((build, index) => (
                    <View key={index} className="bg-ymblue rounded-xl p-6 mb-6">
                        <View className="flex-row gap-y-2 gap-x-48">
                            <Text className="text-black text-xl text-helvetica font-bold">{build.name}</Text>
                            <DeleteBuildButton onPress={() => handleDeleteBuild(index)}/>
                        </View>
                        
                        <Text className="text-black text-helvetica text-sm">{build.description}</Text>
                        
                    </View>
                    ))}
                  </ScrollView>
                )}
            </View>
            <View className="absolute bottom-6 right-6">
                <AddNewButton onPress={handleAddBuild}/>
            </View>
            
        </MainLayout>
    );
}

export default Home;
