import AsyncStorage from '@react-native-async-storage/async-storage';
import { GeneratedContent } from '../types';

const KEYS = {
  session: '@destrave/session',
  contents: '@destrave/contents',
  profile: '@destrave/profile',
};

export async function saveSession(email: string) {
  await AsyncStorage.setItem(KEYS.session, JSON.stringify({ email, active: true }));
}

export async function loadSession(): Promise<{ email: string; active: boolean } | null> {
  const raw = await AsyncStorage.getItem(KEYS.session);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEYS.session);
}

export async function saveGeneratedContent(content: GeneratedContent) {
  const current = await loadGeneratedContents();
  await AsyncStorage.setItem(KEYS.contents, JSON.stringify([content, ...current].slice(0, 50)));
}

export async function loadGeneratedContents(): Promise<GeneratedContent[]> {
  const raw = await AsyncStorage.getItem(KEYS.contents);
  return raw ? JSON.parse(raw) : [];
}

export async function saveProfile(profile: Record<string, string>) {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function loadProfile(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  return raw ? JSON.parse(raw) : {};
}
