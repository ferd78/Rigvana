// navigation/BottomTabs.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import Home from "../pages/Home";
import ForumStack from "./ForumStack";
import Search from "../pages/SearchPage";
import MapPageWrapper from "../pages/MapPageWrapper";
import ProfilePage from "../pages/Profile";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false,
        tabBarIcon: ({ color }) => {
          let iconName;
          if (route.name === "Home") iconName = "home-outline";
          else if (route.name === "Forum") iconName = "chatbox-outline";
          else if (route.name === "Search") iconName = "search-outline";
          else if (route.name === "Map") iconName = "globe-outline";
          else iconName = "person-outline";

          return <Ionicons name={iconName} size={30} color={color} />;
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#5F5F5F",
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
      <Tab.Screen name="Forum" component={ForumStack} />
      <Tab.Screen name="Search" component={Search} />
      <Tab.Screen name="Map" component={MapPageWrapper} />
      <Tab.Screen name="Profile" component={ProfilePage} />
    </Tab.Navigator>
  );
}
