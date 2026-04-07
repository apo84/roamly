import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";

import { colors, fonts } from "../../theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.sansBold, color: colors.foreground, fontSize: 17 },
        headerTintColor: colors.foreground,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansMedium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          headerShown: false,
          tabBarIcon: tabIcon("compass-outline"),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Map",
          tabBarLabel: "Map",
          tabBarIcon: tabIcon("map-outline"),
        }}
      />
      <Tabs.Screen
        name="inspiration"
        options={{
          title: "Inspo",
          tabBarLabel: "Inspo",
          headerShown: false,
          tabBarIcon: tabIcon("sparkles-outline"),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: "Collections",
          tabBarLabel: "Collections",
          headerShown: false,
          tabBarIcon: tabIcon("albums-outline"),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: "Trip",
          tabBarLabel: "Trip",
          tabBarIcon: tabIcon("calendar-outline"),
        }}
      />
      <Tabs.Screen
        name="passport"
        options={{
          title: "Passport",
          tabBarLabel: "Passport",
          tabBarIcon: tabIcon("book-outline"),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarLabel: "Account",
          tabBarIcon: tabIcon("person-circle-outline"),
        }}
      />
    </Tabs>
  );
}
