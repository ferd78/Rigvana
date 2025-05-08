import "./global.css"
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import LoginPage from "./pages/LoginPage";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import Verification from "./pages/Verification";
import SetNewPassword from "./pages/SetNewPassword";
import * as SplashScreen from 'expo-splash-screen';
import BottomTabs from "./navigation/BottomTabs";
import Settings from "./pages/Settings";
import ViewPage from "./pages/ViewPage";

const Stack = createNativeStackNavigator();

SplashScreen.preventAutoHideAsync(); 

function App() {
  const [fontsLoaded] = useFonts({
    Jura: require('./assets/fonts/Jura-Regular.ttf'),
    JuraBold: require('./assets/fonts/Jura-Bold.ttf'),
    Helvetica: require('./assets/fonts/Helvetica.ttf'),
    HelveticaBold: require('./assets/fonts/Helvetica-Bold.ttf')
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginPage} options={{ headerShown: false }}/>
          <Stack.Screen name="Register" component={Register} options={{ headerShown: false }}/>
          <Stack.Screen name="Home" component={Home} options={{ headerShown: false}}/>
          <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false}}/>
          <Stack.Screen name="SetNewPassword" component={SetNewPassword} options={{ headerShown: false}}/>
          <Stack.Screen name="Verification" component={Verification} options={{ headerShown: false}}/>
          <Stack.Screen name="MainTabs" component={BottomTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={Settings} options={{ headerShown: false }} />
          <Stack.Screen name="ViewPage" component={ViewPage} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
  );
}

export default App;