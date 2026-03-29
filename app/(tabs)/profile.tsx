import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [dailyLimit, setDailyLimit] = useState(String(profile?.daily_limit ?? 4));
  const [weeklyLimit, setWeeklyLimit] = useState(String(profile?.weekly_limit ?? 14));
  const [weight, setWeight] = useState(String(profile?.weight_kg ?? ''));
  const [gender, setGender] = useState<'male' | 'female' | 'other' | null>(profile?.gender ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '');
      setFullName(profile.full_name ?? '');
      setDailyLimit(String(profile.daily_limit));
      setWeeklyLimit(String(profile.weekly_limit));
      setWeight(profile.weight_kg ? String(profile.weight_kg) : '');
      setGender(profile.gender ?? null);
    }
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    const daily = parseFloat(dailyLimit);
    const weekly = parseFloat(weeklyLimit);
    if (isNaN(daily) || daily <= 0 || isNaN(weekly) || weekly <= 0) {
      Alert.alert('Invalid limits', 'Please enter valid drink limits.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      username: username.trim() || null,
      full_name: fullName.trim() || null,
      daily_limit: daily,
      weekly_limit: weekly,
      weight_kg: weight ? parseFloat(weight) : null,
      gender,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      await refreshProfile();
      Alert.alert('Saved!', 'Your profile has been updated.');
    }
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>

        {/* Avatar placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#555577" />
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        <Section title="Personal info">
          <Field label="Username" icon="at">
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="yourname"
              placeholderTextColor="#444466"
              autoCapitalize="none"
            />
          </Field>
          <Field label="Full name" icon="person-outline">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor="#444466"
            />
          </Field>
          <Field label="Weight (kg)" icon="barbell-outline">
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="e.g. 75"
              placeholderTextColor="#444466"
              keyboardType="numeric"
            />
          </Field>
          <View style={styles.fieldWrapper}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {(['male', 'female', 'other'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  onPress={() => setGender(gender === g ? null : g)}
                >
                  <Text style={[styles.genderLabel, gender === g && styles.genderLabelActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Section>

        <Section title="Drink limits">
          <Text style={styles.limitsNote}>
            Standard drink guidelines: 4/day, 10/week for lower-risk drinking.
          </Text>
          <Field label="Daily limit (standard drinks)" icon="today-outline">
            <TextInput
              style={styles.input}
              value={dailyLimit}
              onChangeText={setDailyLimit}
              keyboardType="numeric"
              placeholder="4"
              placeholderTextColor="#444466"
            />
          </Field>
          <Field label="Weekly limit (standard drinks)" icon="calendar-outline">
            <TextInput
              style={styles.input}
              value={weeklyLimit}
              onChangeText={setWeeklyLimit}
              keyboardType="numeric"
              placeholder="14"
              placeholderTextColor="#444466"
            />
          </Field>
        </Section>

        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save changes</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#e94560" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>DrinkingBuddy v1.0.0</Text>
        <Text style={styles.disclaimer}>
          This app is for informational purposes only. Always drink responsibly.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.container}>
      <Text style={sectionStyles.title}>{title}</Text>
      <View style={sectionStyles.card}>{children}</View>
    </View>
  );
}

function Field({ label, icon, children }: { label: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <View style={fieldStyles.inputRow}>
        <Ionicons name={icon as any} size={16} color="#666688" style={fieldStyles.icon} />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48, gap: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarContainer: { alignItems: 'center', gap: 8, marginBottom: 4 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
  },
  email: { fontSize: 14, color: '#777799' },
  input: { flex: 1, color: '#fff', fontSize: 15 },
  limitsNote: { fontSize: 13, color: '#666688', lineHeight: 20, marginBottom: 4 },
  fieldWrapper: { gap: 8 },
  fieldLabel: { fontSize: 13, color: '#888899', fontWeight: '600' },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderChip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  genderChipActive: { backgroundColor: 'rgba(233,69,96,0.2)', borderColor: '#e94560' },
  genderLabel: { fontSize: 14, color: '#888899', fontWeight: '600' },
  genderLabelActive: { color: '#e94560' },
  saveButton: {
    backgroundColor: '#e94560', borderRadius: 14, height: 54,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  signOutButton: {
    borderRadius: 14, height: 50, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(233,69,96,0.35)',
  },
  signOutText: { color: '#e94560', fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 13, color: '#444466' },
  disclaimer: { textAlign: 'center', fontSize: 12, color: '#333355', lineHeight: 18 },
});

const sectionStyles = StyleSheet.create({
  container: { gap: 10 },
  title: { fontSize: 13, fontWeight: '700', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 16, gap: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
});

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { fontSize: 13, color: '#888899', fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12, height: 46,
  },
  icon: { marginRight: 8 },
});
