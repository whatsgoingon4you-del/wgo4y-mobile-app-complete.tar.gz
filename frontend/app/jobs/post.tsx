import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

function formatErrorMessage(data: any, fallback: string) {
  if (!data) return fallback;
  if (data?.detail) return formatErrorMessage(data.detail, fallback);

  if (Array.isArray(data)) {
    const msgs = data
      .map((e) => {
        const loc = Array.isArray(e?.loc) ? e.loc.join(".") : "";
        const msg = e?.msg || e?.message || JSON.stringify(e);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    return msgs.length ? msgs.join("\n") : fallback;
  }

  if (typeof data === "string") return data;
  return data?.message || fallback;
}

async function authedPost(path: string, body: any) {
  const baseUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "https://service-finder-254.preview.emergentagent.com";

  const token = await AsyncStorage.getItem("auth_token");
  if (!token) throw new Error("Missing auth token. Please sign in again.");

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = formatErrorMessage(data, `Request failed (${res.status})`);
    throw new Error(msg);
  }

  return data;
}

export default function PostJobScreen() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("SC");
  const [jobType, setJobType] = useState("");
  const [payType, setPayType] = useState("");
  const [pay, setPay] = useState("");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return Alert.alert("Missing info", "Please enter a job title.");
    if (!role.trim()) return Alert.alert("Missing info", "Please enter a role (example: DJ, Bartender, Security).");
    if (!location.trim()) return Alert.alert("Missing info", "Please enter a location (venue name or address).");
    if (!city.trim()) return Alert.alert("Missing info", "Please enter a city.");
    if (!state.trim()) return Alert.alert("Missing info", "Please enter a state (example: SC).");
    if (!jobType.trim()) return Alert.alert("Missing info", "Please enter a job type (example: one-time, part-time).");
    if (!payType.trim()) return Alert.alert("Missing info", "Please enter a pay type (example: hourly, flat).");
    if (!description.trim()) return Alert.alert("Missing info", "Please enter a job description.");

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        role: role.trim(),
        event_date: eventDate.trim() || undefined,
        location: location.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        job_type: jobType.trim(),
        pay_type: payType.trim(),
        pay: pay.trim() || undefined,
        description: description.trim()
      };

      const created = await authedPost("/api/jobs", payload);

      Alert.alert("Posted", "Job posted successfully.");
      const newId = created?.id || created?._id;
      if (newId) router.replace(`/jobs/${newId}`);
      else router.back();
    } catch (e: any) {
      Alert.alert("Could not post job", e?.message || "Failed to post job.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Post New Job</Text>
        <Text style={styles.subtitle}>Fill this out to publish a job to the Job Board.</Text>

        <Text style={styles.label}>Job Title *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Example: Friday Night DJ Needed"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Role *</Text>
        <TextInput
          value={role}
          onChangeText={setRole}
          placeholder="Example: DJ / Bartender / Security"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Event Date (optional)</Text>
        <TextInput
          value={eventDate}
          onChangeText={setEventDate}
          placeholder="Example: 2026-01-10 or Jan 10-12"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Location (Venue/Address) *</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Example: Rack'em Up - 123 Main St"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Example: Chesnee"
              style={styles.input}
              placeholderTextColor="#999"
            />
          </View>

          <View style={{ width: 12 }} />

          <View style={{ width: 90 }}>
            <Text style={styles.label}>State *</Text>
            <TextInput
              value={state}
              onChangeText={setState}
              placeholder="SC"
              style={styles.input}
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
        </View>

        <Text style={styles.label}>Job Type *</Text>
        <TextInput
          value={jobType}
          onChangeText={setJobType}
          placeholder="Example: one-time / part-time / full-time"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Pay Type *</Text>
        <TextInput
          value={payType}
          onChangeText={setPayType}
          placeholder="Example: hourly / flat / commission"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Pay (optional)</Text>
        <TextInput
          value={pay}
          onChangeText={setPay}
          placeholder="Example: $150 flat / $25/hr"
          style={styles.input}
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the role, time, requirements, and what you're paying."
          style={[styles.input, styles.textarea]}
          placeholderTextColor="#999"
          multiline
        />

        <Pressable
          onPress={submit}
          disabled={submitting}
          style={[styles.primaryBtn, submitting ? { opacity: 0.6 } : null]}
        >
          <Text style={styles.primaryBtnText}>{submitting ? "Posting…" : "Post Job"}</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Cancel</Text>
        </Pressable>

        <Text style={styles.note}>
          Note: Posting jobs requires a premium tier for Job Board access. If you see an error about upgrading, that is expected for non-premium test accounts.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 6, color: "#1565ff" },
  subtitle: { color: "#666", marginBottom: 16 },

  row2: { flexDirection: "row", alignItems: "flex-start" },

  label: { fontWeight: "700", marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f9f9f9",
    color: "#111"
  },
  textarea: { minHeight: 120, textAlignVertical: "top" },

  primaryBtn: {
    backgroundColor: "#1565ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#bbb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "#fff"
  },
  secondaryBtnText: { color: "#111", fontWeight: "700" },

  note: { marginTop: 14, color: "#666", fontSize: 12, lineHeight: 16 }
});
