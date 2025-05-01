import { View } from "react-native";
import TopHeader from "./TopHeader";

function MainLayout({children}){
    return (
        <View className="bg-semiblack h-full relative">
            <TopHeader/>
            {children}
        </View>
    );
}

export default MainLayout;