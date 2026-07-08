import React from "react";
import { View, Text, Pressable, StyleSheet, Share, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useGame } from "../state/gameStore";
import { colors, spacing, radius } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Result">;

export default function ResultScreen({ navigation }: Props) {
  const g = useGame();

  const share = async () => {
    if (g.shareText) await Share.share({ message: g.shareText });
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.l }}>
      <Text style={[s.verdict, { color: g.solved ? colors.success : colors.danger }]}>
        {g.solved ? "VAKA ÇÖZÜLDÜ" : "KATİL KAÇTI"}
      </Text>
      <Text style={s.stat}>
        {g.solved
          ? `${g.questionsUsed} soruda çözdün, dedektif.`
          : "Bu sefer olmadı. Yarın yeni bir vaka seni bekliyor."}
      </Text>
      {g.solved && g.streak > 0 && (
        <Text style={s.streak}>🔥 Seri: {g.streak} gün{g.streak === g.bestStreak ? " — rekorun!" : ""}</Text>
      )}

      {g.reveal && (
        <View style={s.revealBox}>
          <Text style={s.revealTitle}>NE OLMUŞTU?</Text>
          <Text style={s.revealText}>{g.reveal}</Text>
        </View>
      )}

      {g.shareText && (
        <Pressable style={s.cta} onPress={share}>
          <Text style={s.ctaText}>Sonucu Paylaş</Text>
        </Pressable>
      )}

      <Pressable style={s.home} onPress={() => navigation.popToTop()}>
        <Text style={s.homeText}>Ana Ekrana Dön</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  verdict: { fontSize: 32, fontWeight: "900", letterSpacing: 1, textAlign: "center", marginTop: spacing.l },
  stat: { color: colors.muted, textAlign: "center", marginTop: spacing.s, fontSize: 15 },
  streak: { color: colors.amber, textAlign: "center", marginTop: spacing.s, fontSize: 16, fontWeight: "800" },
  revealBox: {
    backgroundColor: colors.card, borderRadius: radius.m, padding: spacing.m, marginTop: spacing.l,
  },
  revealTitle: { color: colors.cyan, fontWeight: "800", fontSize: 11, letterSpacing: 1.5, marginBottom: spacing.s },
  revealText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  cta: {
    backgroundColor: colors.cyan, borderRadius: radius.m, paddingVertical: 15,
    alignItems: "center", marginTop: spacing.l,
  },
  ctaText: { color: colors.navy, fontWeight: "800", fontSize: 15 },
  home: { alignItems: "center", marginTop: spacing.m, padding: spacing.s },
  homeText: { color: colors.muted, fontSize: 14 },
});
