import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useGame } from "../state/gameStore";
import { colors, spacing, radius } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Briefing">;

export default function BriefingScreen({ navigation }: Props) {
  const { briefing, suspects, questionLimit } = useGame();
  if (!briefing) return null;

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.m, paddingBottom: 40 }}>
      <Text style={s.h}>{briefing.title}</Text>
      <Text style={s.p}>{briefing.crime}</Text>

      <Text style={s.section}>Bilinenler</Text>
      {briefing.known_facts.map((f: string, i: number) => (
        <View key={i} style={s.fact}>
          <Text style={s.factText}>{f}</Text>
        </View>
      ))}

      <Text style={s.section}>Şüpheliler</Text>
      {suspects.map((sus) => (
        <View key={sus.id} style={s.suspect}>
          <Text style={s.susName}>{sus.name}</Text>
          <Text style={s.susRole}>{sus.role}</Text>
        </View>
      ))}

      <Pressable style={s.cta} onPress={() => navigation.navigate("Interrogation")}>
        <Text style={s.ctaText}>Sorguya Başla — {questionLimit} soru hakkın var</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  h: { color: colors.text, fontSize: 26, fontWeight: "800", marginBottom: spacing.s },
  p: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  section: { color: colors.cyan, fontWeight: "800", marginTop: spacing.l, marginBottom: spacing.s, letterSpacing: 1 },
  fact: { backgroundColor: colors.card2, borderRadius: radius.s, padding: spacing.m, marginBottom: spacing.s },
  factText: { color: colors.text, fontSize: 14 },
  suspect: { backgroundColor: colors.card, borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.s },
  susName: { color: colors.text, fontWeight: "700", fontSize: 16 },
  susRole: { color: colors.muted, fontSize: 13, marginTop: 2 },
  cta: { backgroundColor: colors.cyan, borderRadius: radius.m, paddingVertical: 16, alignItems: "center", marginTop: spacing.l },
  ctaText: { color: colors.navy, fontWeight: "800", fontSize: 15 },
});
