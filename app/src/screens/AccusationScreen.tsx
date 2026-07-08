import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { useGame } from "../state/gameStore";
import { colors, spacing, radius } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Accusation">;

export default function AccusationScreen({ navigation }: Props) {
  const g = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accuse = () => {
    if (!selected || !g.caseId) return;
    const name = g.suspects.find((x) => x.id === selected)?.name;
    Alert.alert(
      "Tek atış hakkın var",
      `${name} suçlu diyorsun. Yanılırsan vaka bugünlük kapanır. Emin misin?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Suçla",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const r = await api.accuse(g.caseId!, selected);
              g.setResult(r);
              navigation.replace("Result");
            } catch (e: any) {
              Alert.alert("Hata", e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={s.wrap} contentContainerStyle={{ padding: spacing.m }}>
      <Text style={s.h}>Katil kim?</Text>
      <Text style={s.p}>
        Kanıt panonda {g.slips.length} sızdırılmış gerçek var. Kararını ver — bu suçlama geri alınamaz.
      </Text>

      {g.slips.length > 0 && (
        <View style={s.board}>
          <Text style={s.boardTitle}>KANIT PANOSU</Text>
          {g.slips.map((slip, i) => (
            <Text key={i} style={s.boardItem}>
              • {g.suspects.find((x) => x.id === slip.suspectId)?.name}: “{slip.truth}”
            </Text>
          ))}
        </View>
      )}

      {g.suspects.map((sus) => (
        <Pressable
          key={sus.id}
          style={[s.suspect, selected === sus.id && s.suspectSelected]}
          onPress={() => setSelected(sus.id)}
        >
          <Text style={[s.susName, selected === sus.id && { color: colors.amber }]}>{sus.name}</Text>
          <Text style={s.susRole}>{sus.role}</Text>
        </Pressable>
      ))}

      <Pressable
        style={[s.cta, (!selected || busy) && { opacity: 0.4 }]}
        disabled={!selected || busy}
        onPress={accuse}
      >
        <Text style={s.ctaText}>{busy ? "..." : "SUÇLA"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  h: { color: colors.text, fontSize: 26, fontWeight: "800" },
  p: { color: colors.muted, marginTop: spacing.s, marginBottom: spacing.m, lineHeight: 20 },
  board: {
    backgroundColor: colors.card2, borderRadius: radius.m, padding: spacing.m,
    marginBottom: spacing.m, borderWidth: 1, borderColor: colors.amber,
  },
  boardTitle: { color: colors.amber, fontWeight: "800", fontSize: 11, letterSpacing: 1.5, marginBottom: spacing.s },
  boardItem: { color: colors.text, fontSize: 13, marginBottom: 4, lineHeight: 19 },
  suspect: {
    backgroundColor: colors.card, borderRadius: radius.m, padding: spacing.m,
    marginBottom: spacing.s, borderWidth: 1.5, borderColor: colors.card,
  },
  suspectSelected: { borderColor: colors.amber },
  susName: { color: colors.text, fontWeight: "700", fontSize: 16 },
  susRole: { color: colors.muted, fontSize: 13, marginTop: 2 },
  cta: {
    backgroundColor: colors.amber, borderRadius: radius.m, paddingVertical: 16,
    alignItems: "center", marginTop: spacing.m,
  },
  ctaText: { color: colors.navy, fontWeight: "900", fontSize: 16, letterSpacing: 1 },
});
