import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { useGame } from "../state/gameStore";
import { colors, spacing, radius } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

function msToNextUtcMidnight(): string {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h} sa ${m} dk`;
}

export default function HomeScreen({ navigation }: Props) {
  const { loadCase, caseNo, briefing, accused, solved, streak } = useGame();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(msToNextUtcMidnight());

  useEffect(() => {
    api
      .todayCase()
      .then((p) => loadCase(p))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const t = setInterval(() => setCountdown(msToNextUtcMidnight()), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading)
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.cyan} size="large" />
      </View>
    );

  if (error)
    return (
      <View style={s.center}>
        <Text style={s.err}>Sunucuya ulaşılamadı: {error}</Text>
        <Text style={s.muted}>src/api/client.ts içindeki BASE_URL'i kontrol et.</Text>
      </View>
    );

  return (
    <View style={s.wrap}>
      <View style={s.topRow}>
        <Text style={s.caseNo}>VAKA #{caseNo}</Text>
        {streak > 0 && <Text style={s.streak}>🔥 {streak} gün</Text>}
      </View>
      <Text style={s.title}>{briefing?.title}</Text>
      <Text style={s.muted}>{briefing?.setting}</Text>

      <Pressable
        style={s.cta}
        onPress={() => navigation.navigate(accused ? "Result" : "Briefing")}
      >
        <Text style={s.ctaText}>
          {accused ? (solved ? "Sonucu Gör — Çözdün 🔍" : "Sonucu Gör") : "Vakayı Aç"}
        </Text>
      </Pressable>

      <Text style={s.countdown}>Sonraki vaka: {countdown}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: spacing.l, justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.l },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.s },
  caseNo: { color: colors.amber, fontWeight: "800", letterSpacing: 2 },
  streak: { color: colors.amber, fontWeight: "800", fontSize: 15 },
  title: { color: colors.text, fontSize: 34, fontWeight: "800", marginBottom: spacing.s },
  muted: { color: colors.muted, fontSize: 15, marginTop: spacing.s },
  err: { color: colors.danger, fontSize: 16, textAlign: "center" },
  cta: {
    backgroundColor: colors.cyan,
    borderRadius: radius.m,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  ctaText: { color: colors.navy, fontWeight: "800", fontSize: 17 },
  countdown: { color: colors.muted, textAlign: "center", marginTop: spacing.l },
});
