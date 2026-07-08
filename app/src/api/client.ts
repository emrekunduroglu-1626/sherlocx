import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Geliştirme: bilgisayarının yerel IP'sini yaz (localhost cihazda çalışmaz).
 * TODO(prod): env/config'e taşı.
 */
export const BASE_URL = "http://192.168.1.100:4000";

let deviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (deviceId) return deviceId;
  let id = await AsyncStorage.getItem("sx_device_id");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    await AsyncStorage.setItem("sx_device_id", id);
  }
  deviceId = id;
  return id;
}

async function req(path: string, init?: RequestInit) {
  const id = await getDeviceId();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-device-id": id,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "hata"), { code: data.code, status: res.status });
  return data;
}

export const api = {
  todayCase: () => req("/api/case/today"),
  ask: (caseId: string, suspectId: string, question: string) =>
    req(`/api/case/${caseId}/ask`, { method: "POST", body: JSON.stringify({ suspectId, question }) }),
  accuse: (caseId: string, suspectId: string) =>
    req(`/api/case/${caseId}/accuse`, { method: "POST", body: JSON.stringify({ suspectId }) }),
};
