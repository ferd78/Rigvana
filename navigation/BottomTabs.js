import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { FELIX_URL } from "../ipconfig";
import { HARMAN_URL } from "../ipconfig";
import MapPage from "../pages/MapPage";
import Home from "../pages/Home";
import ForumPage from "../pages/ForumPage";


const Tab = createBottomTabNavigator();

function BottomTabs(){
    return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarIcon: ({ color }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home-outline';
          else if (route.name === 'Forum') iconName = 'chatbox-outline';
          else if (route.name === 'Map') iconName = 'globe-outline';

          return <Ionicons name={iconName} size={30} color={color} />;
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#5F5F5F',
        tabBarStyle: {
          height: 50,
          backgroundColor: "#161010",
          borderTopWidth: 0,
          paddingTop: 6,
        },
        headerShown: false,
        })}
        >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Forum" component={ForumPage} />
      <Tab.Screen name="Map" component={MapPage} />
    </Tab.Navigator>
    );
}

export default BottomTabs;