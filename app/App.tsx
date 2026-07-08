import React from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./src/screens/HomeScreen";
import BriefingScreen from "./src/screens/BriefingScreen";
import InterrogationScreen from "./src/screens/InterrogationScreen";
import AccusationScreen from "./src/screens/AccusationScreen";
import ResultScreen from "./src/screens/ResultScreen";
import { colors } from "./src/theme";

export type RootStackParamList = {
  Home: undefined;
  Briefing: undefined;
  Interrogation: undefined;
  Accusation: undefined;
  Result: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.navy, card: colors.navy, text: colors.text, primary: colors.cyan },
};

export default function App() {
  return (
    <NavigationContainer theme={theme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.navy },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "SherlocX" }} />
        <Stack.Screen name="Briefing" component={BriefingScreen} options={{ title: "Vaka Dosyası" }} />
        <Stack.Screen name="Interrogation" component={InterrogationScreen} options={{ title: "Sorgu" }} />
        <Stack.Screen name="Accusation" component={AccusationScreen} options={{ title: "Suçlama" }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ title: "Sonuç", headerBackVisible: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
