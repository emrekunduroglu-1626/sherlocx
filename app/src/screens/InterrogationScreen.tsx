import React, { useRef, useState } from "react";
import {
  View, Text, TextInput, Pressable, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { api } from "../api/client";
import { useGame, ChatMsg } from "../state/gameStore";
import { colors, spacing, radius } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "Interrogation">;

export default function InterrogationScreen({ navigation }: Props) {
  const g = useGame();
  const [activeSuspect, setActiveSuspect] = useState(g.suspects[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);

  const remaining = g.questionLimit - g.questionsUsed;
  const msgs = g.transcripts[activeSuspect] ?? [];

  const send = async () => {
    const q = input.trim();
    if (!q || sending || !g.caseId) return;
    if (remaining <= 0) {
      Alert.alert("Soru hakkın bitti", "Artık suçlama yapma zamanı, dedektif.");
      return;
    }
    setSending(true);
    setInput("");
    try {
      const r = await api.ask(g.caseId, activeSuspect, q);
      g.addTurn(activeSuspect, q, r.answer, r.slipped);
      g.setProgress(r.questionsUsed, r.questionsRemaining, r.slips, r.hint);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert("Hata", e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.wrap}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Şüpheli seçici */}
      <View style={s.tabs}>
        {g.suspects.map((sus) => (
          <Pressable
            key={sus.id}
            style={[s.tab, activeSuspect === sus.id && s.tabActive]}
            onPress={() => setActiveSuspect(sus.id)}
          >
            <Text style={[s.tabText, activeSuspect === sus.id && s.tabTextActive]}>
              {sus.name.split(" ")[0]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sayaç + kanıt panosu özeti */}
      <View style={s.meta}>
        <Text style={s.counter}>
          Soru: <Text style={{ color: remaining <= 3 ? colors.danger : colors.cyan }}>{remaining}</Text>/{g.questionLimit}
        </Text>
        <Text style={s.slips}>Pano: {g.slips.length} kanıt</Text>
      </View>

      {g.hint && (
        <View style={s.hintBox}>
          <Text style={s.hintText}>İpucu: {g.hint}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: spacing.m, paddingBottom: spacing.l }}
        renderItem={({ item }) => (
          <View
            style={[
              s.bubble,
              item.role === "player" ? s.bubblePlayer : s.bubbleSuspect,
              item.slipped && s.bubbleSlip,
            ]}
          >
            {item.slipped && <Text style={s.slipTag}>AÇIK VERDİ</Text>}
            <Text style={item.role === "player" ? s.bubblePlayerText : s.bubbleText}>
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={s.empty}>
            {g.suspects.find((x) => x.id === activeSuspect)?.name} sorgu odasında. İlk soruyu sor.
          </Text>
        }
      />

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder="Sorunu yaz..."
          placeholderTextColor={colors.muted}
          maxLength={300}
          editable={!sending}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={[s.send, sending && { opacity: 0.5 }]} onPress={send}>
          <Text style={s.sendText}>{sending ? "..." : "Sor"}</Text>
        </Pressable>
      </View>

      <Pressable style={s.accuse} onPress={() => navigation.navigate("Accusation")}>
        <Text style={s.accuseText}>Suçlamaya Geç</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1 },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.m, paddingTop: spacing.s, gap: spacing.s },
  tab: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
    backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.card2,
  },
  tabActive: { borderColor: colors.cyan, backgroundColor: colors.card },
  tabText: { color: colors.muted, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: colors.cyan },
  meta: { flexDirection: "row", justifyContent: "space-between", padding: spacing.m, paddingBottom: 0 },
  counter: { color: colors.text, fontWeight: "700" },
  slips: { color: colors.amber, fontWeight: "700" },
  hintBox: {
    margin: spacing.m, marginBottom: 0, padding: spacing.m,
    backgroundColor: colors.card2, borderRadius: radius.s, borderWidth: 1, borderColor: colors.amber,
  },
  hintText: { color: colors.amber, fontSize: 13 },
  bubble: { borderRadius: radius.m, padding: spacing.m, marginBottom: spacing.s, maxWidth: "85%" },
  bubblePlayer: { backgroundColor: colors.cyan, alignSelf: "flex-end" },
  bubbleSuspect: { backgroundColor: colors.card, alignSelf: "flex-start" },
  bubbleSlip: { borderWidth: 1.5, borderColor: colors.amber },
  bubbleText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  bubblePlayerText: { color: colors.navy, fontSize: 15, lineHeight: 21, fontWeight: "600" },
  slipTag: { color: colors.amber, fontWeight: "800", fontSize: 10, letterSpacing: 1, marginBottom: 4 },
  empty: { color: colors.muted, textAlign: "center", marginTop: spacing.xl, paddingHorizontal: spacing.l },
  inputRow: { flexDirection: "row", padding: spacing.m, gap: spacing.s },
  input: {
    flex: 1, backgroundColor: colors.card2, borderRadius: radius.m,
    paddingHorizontal: spacing.m, paddingVertical: 12, color: colors.text, fontSize: 15,
  },
  send: { backgroundColor: colors.cyan, borderRadius: radius.m, paddingHorizontal: 20, justifyContent: "center" },
  sendText: { color: colors.navy, fontWeight: "800" },
  accuse: {
    marginHorizontal: spacing.m, marginBottom: spacing.m, paddingVertical: 13,
    borderRadius: radius.m, borderWidth: 1.5, borderColor: colors.amber, alignItems: "center",
  },
  accuseText: { color: colors.amber, fontWeight: "800", fontSize: 15 },
});
