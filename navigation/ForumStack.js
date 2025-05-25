import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ForumPage from "../pages/ForumPage";
import DiscussionPage from "../pages/DiscussionPage";
import OtherProfile from '../pages/OtherProfile';


const Stack = createNativeStackNavigator();

export default function ForumStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Forum" component={ForumPage} />
      <Stack.Screen name="Discussion" component={DiscussionPage} />
      <Stack.Screen name="OtherProfile" component={OtherProfile} />
    </Stack.Navigator>
  );
}
