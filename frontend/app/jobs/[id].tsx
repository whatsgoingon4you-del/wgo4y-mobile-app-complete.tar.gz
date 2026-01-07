import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Job = {
  id?: string;
  _id?: string;
  title?: string;
  description?: string;
  status?: string;
  location?: string;
  city?: string;
  county?: string;
  pay?: string;
  pay_rate?: string;
  payType?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  owner_id?: string;
  business_name?: string;
};

type Applicant = {
  // application identifiers (backend may send one or the other)
  id?: string;
  application_id?: string;

  // new schema
  applicant_id?: string;
  applicant_name?: string;
  applicant_type?: string;

  // backward compatibility (older schema)
  worker_id?: string;
  worker_name?: string;
  worker_role?: string;
  worker_services?: string[];

  note?: string;
  message?: string;
  status?: string;
  created_at?: string;
  applied_at?: string;
};

type ApplicantsResponse =
  | {
      job?: any;
      applicants?: Applicant[];
      total_count?: number;
    }
  | Applicant[];

const STATUS_OPTIONS = ["pending", "open", "filled", "closed"];

async function authedFetch(path: string, options: RequestInit = {}) {
  const baseUrl =
    process.env.EXPO_PUBLIC_BACKEND_URL ||
    "https://service-finder-254.preview.emergentagent.com";

  // IMPORTANT: AuthContext stores token under 'auth_token'
  const token = await AsyncStorage.getItem("auth_token");
  if (!token) throw new Error("Missing auth token. Please sign in again.");

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg = data?.detail || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const jobId = useMemo(() => {
    const raw = params.id;
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw)) return raw[0] || "";
    return "";
  }, [params.id]);

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<Job | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    if (!jobId) {
      setError("Missing job id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const jobData = await authedFetch(`/api/jobs/${jobId}`);
      setJob(jobData);

      // Owner-only endpoint; if not owner, it will fail and we just show none.
      try {
        const applicantsResp: ApplicantsResponse = await authedFetch(`/api/jobs/${jobId}/applicants`);

        // Endpoint returns an object: { job, applicants, total_count }
        // but keep compatibility if it ever returns an array directly.
        if (Array.isArray(applicantsResp)) {
          setApplicants(applicantsResp);
        } else {
          setApplicants(applicantsResp?.applicants || []);
        }
      } catch {
        setApplicants([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load job.");
      setJob(null);
      setApplicants([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (status: string) => {
    try {
      await authedFetch(`/api/jobs/${jobId}/status?status=${encodeURIComponent(status)}`, {
        method: "PATCH"
      });
      Alert.alert("Success", `Job status updated to ${status}`);
      await load();
    } catch (e: any) {
      Alert.alert("Status update failed", e?.message || "Failed to update status.");
    }
  };

  const confirmDelete = async () => {
    Alert.alert("Delete job?", "This will permanently delete the job posting.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await authedFetch(`/api/jobs/${jobId}`, { method: "DELETE" });
            Alert.alert("Deleted", "Job posting deleted.");
            router.back();
          } catch (e: any) {
            Alert.alert("Delete failed", e?.message || "Failed to delete job.");
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.muted}>Loading job…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Job Details</Text>
        <Text style={styles.error}>{error}</Text>

        <Pressable style={styles.primaryBtn} onPress={load}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
          <Text style={styles.secondaryBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const jobTitle = job?.title || "Untitled job";
  const status = job?.status || "unknown";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <Text style={styles.title}>{jobTitle}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Status: </Text>
          {status}
        </Text>
        {!!job?.business_name && (
          <Text style={styles.row}>
            <Text style={styles.label}>Business: </Text>
            {job.business_name}
          </Text>
        )}
        {!!job?.city && (
          <Text style={styles.row}>
            <Text style={styles.label}>City: </Text>
            {job.city}
          </Text>
        )}
        {!!job?.county && (
          <Text style={styles.row}>
            <Text style={styles.label}>County: </Text>
            {job.county}
          </Text>
        )}
        {!!job?.location && (
          <Text style={styles.row}>
            <Text style={styles.label}>Location: </Text>
            {job.location}
          </Text>
        )}
        {!!job?.pay && (
          <Text style={styles.row}>
            <Text style={styles.label}>Pay: </Text>
            {job.pay}
          </Text>
        )}
        {!!job?.pay_rate && (
          <Text style={styles.row}>
            <Text style={styles.label}>Pay rate: </Text>
            {job.pay_rate}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.paragraph}>{job?.description || "No description provided."}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions (Owner)</Text>
        <Text style={styles.muted}>
          If you are not the owner of this job, status/applicants actions may be restricted.
        </Text>

        <Text style={[styles.label, { marginTop: 12 }]}>Update status:</Text>
        <View style={styles.statusRow}>
          {STATUS_OPTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => updateStatus(s)}
              style={[styles.chip, status === s ? styles.chipActive : null]}
            >
              <Text style={[styles.chipText, status === s ? styles.chipTextActive : null]}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.dangerBtn, { marginTop: 12 }]} onPress={confirmDelete}>
          <Text style={styles.dangerBtnText}>Delete Job</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Applicants</Text>
        {applicants.length === 0 ? (
          <Text style={styles.muted}>No applicants found (or you don’t have access).</Text>
        ) : (
          <FlatList
            data={applicants}
            keyExtractor={(item) =>
              item.id ||
              item.application_id ||
              item.applicant_id ||
              item.worker_id ||
              Math.random().toString()
            }
            scrollEnabled={false}
            renderItem={({ item }) => {
              const displayName =
                item.applicant_name ||
                item.worker_name ||
                "Unnamed applicant";

              const noteText = item.note || item.message;

              return (
                <View style={styles.applicant}>
                  <Text style={styles.applicantName}>{displayName}</Text>
                  <Text style={styles.mutedSmall}>{item.status || "pending"}</Text>
                  {!!noteText && <Text style={styles.note}>Note: {noteText}</Text>}
                  {!!item.worker_services?.length && (
                    <Text style={styles.mutedSmall}>Services: {item.worker_services.join(", ")}</Text>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>

      <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
        <Text style={styles.secondaryBtnText}>Back to Jobs</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 16 },

  title: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },

  card: {
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fafafa"
  },

  row: { marginBottom: 6, fontSize: 14 },
  label: { fontWeight: "700" },
  paragraph: { fontSize: 14, lineHeight: 20 },

  muted: { color: "#666", fontSize: 13, marginTop: 4 },
  mutedSmall: { color: "#666", fontSize: 12, marginTop: 2 },

  error: { color: "#b00020", marginBottom: 12 },

  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },

  chip: {
    borderWidth: 1,
    borderColor: "#bbb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#fff"
  },
  chipActive: { borderColor: "#1565ff", backgroundColor: "#eaf0ff" },
  chipText: { fontSize: 12, color: "#333" },
  chipTextActive: { color: "#1565ff", fontWeight: "700" },

  primaryBtn: {
    backgroundColor: "#1565ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#bbb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#fff"
  },
  secondaryBtnText: { color: "#111", fontWeight: "700" },

  dangerBtn: {
    backgroundColor: "#b00020",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  dangerBtnText: { color: "#fff", fontWeight: "800" },

  applicant: {
    borderTopWidth: 1,
    borderTopColor: "#e6e6e6",
    paddingTop: 10,
    marginTop: 10
  },
  applicantName: { fontSize: 14, fontWeight: "800" },
  note: { fontSize: 13, marginTop: 6 }
});


