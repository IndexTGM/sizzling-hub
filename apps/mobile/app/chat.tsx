import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { getImageCandidates } from "@/lib/storage";

const PRIMARY = "#dc2626";
const PLACEHOLDER = "placeholder.png";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";

interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_role: "customer" | "admin";
  message: string | null;
  image_url: string | null;
  created_at: string;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const am = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${am}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { orderId, branchName } = useLocalSearchParams<{ orderId: string; branchName?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) setLoading(true);
    const { data } = await supabase
      .from("order_messages")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => fetchMessages(true), 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setSending(false); return; }
    const { error } = await supabase.from("order_messages").insert({
      order_id: orderId,
      sender_id: session.user.id,
      sender_role: "customer",
      message: trimmed,
    });
    if (!error) {
      setText("");
      await fetchMessages(true);
    }
    setSending(false);
  }

  async function handlePickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow access to your photo library to upload images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const file = result.assets[0];

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setUploading(false); return; }

    const ext = (file.uri.split(".").pop() || "png").split("?")[0];
    const path = `chat/${orderId}/${Date.now()}.${ext}`;

    // Read file as base64 via expo-file-system, decode to ArrayBuffer
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error: uploadErr } = await supabase.storage
      .from("images")
      .upload(path, arrayBuffer, {
        upsert: true,
        contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
      });

    if (uploadErr) {
      Alert.alert("Upload failed", uploadErr.message);
      setUploading(false);
      return;
    }

    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${path}`;
    const { error: msgErr } = await supabase.from("order_messages").insert({
      order_id: orderId,
      sender_id: session.user.id,
      sender_role: "customer",
      image_url: imageUrl,
    });
    if (!msgErr) await fetchMessages(true);
    setUploading(false);
  }

  const renderMessage = useCallback(({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.sender_role === "customer";
    const showDate = index === 0 || fmtDate(item.created_at) !== fmtDate(messages[index - 1].created_at);
    return (
      <View key={item.id}>
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>{fmtDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
          <View style={[styles.msgBubbleWrap, isMine ? styles.msgBubbleWrapMine : styles.msgBubbleWrapTheirs]}>
            {!isMine && (
              <Text style={styles.msgSenderLabel}>
                {item.sender_role === "admin" ? "Staff" : "Customer"}
              </Text>
            )}
            {item.message ? (
              <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleTheirs]}>
                <Text style={[styles.msgText, isMine ? styles.msgTextMine : styles.msgTextTheirs]}>
                  {item.message}
                </Text>
              </View>
            ) : null}
            {item.image_url ? (
              <TouchableOpacity onPress={() => {/* would open fullscreen */}}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.msgImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}>
              {fmtTime(item.created_at)}
            </Text>
          </View>
        </View>
      </View>
    );
  }, [messages]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>💬 Order Chat</Text>
          <Text style={styles.headerSub}>Order #{orderId?.slice(0, 8).toUpperCase()}…</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Branch name banner */}
      {branchName && (
        <View style={styles.branchBanner}>
          <Text style={styles.branchBannerText}>
            🏢 Chatting with <Text style={styles.branchBannerName}>{branchName}</Text>
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        {loading && messages.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet.</Text>
            <Text style={styles.emptySub}>
              Send your GCash payment proof or ask a question.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Input area */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={[styles.attachBtn, uploading && styles.attachBtnDisabled]}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#9ca3af" />
            ) : (
              <Text style={styles.attachIcon}>📎</Text>
            )}
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Send a message or GCash proof…"
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            activeOpacity={0.7}
          >
            <Text style={styles.sendBtnText}>{sending ? "…" : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fafafa" },
  flex: { flex: 1 },

  // ─── Header ───
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 18, fontWeight: "700", color: "#374151" },
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0a0a0a" },
  headerSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  headerSpacer: { width: 36 },

  // ─── Branch Banner ───
  branchBanner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  branchBannerText: { fontSize: 12, color: "#6b7280" },
  branchBannerName: { fontWeight: "700", color: "#374151" },

  // ─── Loading / Empty ───
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#9ca3af" },
  emptySub: { fontSize: 12, color: "#d1d5db" },

  // ─── Messages ───
  messagesList: { padding: 12, paddingBottom: 8 },
  dateSeparator: { alignItems: "center", marginVertical: 12 },
  dateText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9ca3af",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  msgRow: { flexDirection: "row", marginBottom: 6 },
  msgRowMine: { justifyContent: "flex-end" },
  msgRowTheirs: { justifyContent: "flex-start" },
  msgBubbleWrap: { maxWidth: "80%" },
  msgBubbleWrapMine: { alignItems: "flex-end" },
  msgBubbleWrapTheirs: { alignItems: "flex-start" },
  msgSenderLabel: { fontSize: 10, fontWeight: "700", color: "#9ca3af", marginBottom: 1, marginLeft: 4 },
  msgBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, marginBottom: 2 },
  msgBubbleMine: { backgroundColor: PRIMARY, borderBottomRightRadius: 4 },
  msgBubbleTheirs: { backgroundColor: "#f3f4f6", borderBottomLeftRadius: 4 },
  msgText: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
  msgTextMine: { color: "#fff" },
  msgTextTheirs: { color: "#1f2937" },
  msgImage: { width: 180, height: 180, borderRadius: 14, marginVertical: 4, borderWidth: 1, borderColor: "#e5e7eb" },
  msgTime: { fontSize: 10 },
  msgTimeMine: { color: "#9ca3af", textAlign: "right", marginRight: 4 },
  msgTimeTheirs: { color: "#9ca3af", marginLeft: 4 },

  // ─── Input Bar ───
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  attachBtnDisabled: { opacity: 0.5 },
  attachIcon: { fontSize: 20 },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    fontSize: 14,
    color: "#0a0a0a",
    backgroundColor: "#fff",
  },
  sendBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});