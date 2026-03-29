import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DrinkPreset } from '@/types/database';

const DRINK_TYPES = [
  { key: 'beer', label: 'Beer', emoji: '🍺', defaultAbv: 5, defaultMl: 375 },
  { key: 'wine', label: 'Wine', emoji: '🍷', defaultAbv: 13, defaultMl: 150 },
  { key: 'spirit', label: 'Spirit', emoji: '🥃', defaultAbv: 40, defaultMl: 30 },
  { key: 'cocktail', label: 'Cocktail', emoji: '🍹', defaultAbv: 14, defaultMl: 200 },
  { key: 'cider', label: 'Cider', emoji: '🍎', defaultAbv: 5, defaultMl: 375 },
  { key: 'champagne', label: 'Champagne', emoji: '🥂', defaultAbv: 12, defaultMl: 150 },
  { key: 'other', label: 'Other', emoji: '🫗', defaultAbv: 5, defaultMl: 250 },
];

// Standard drinks = (volume_ml × abv% × 0.789) / 10
function calcStandardDrinks(volumeMl: number, abvPercent: number) {
  return (volumeMl * (abvPercent / 100) * 789) / 10000;
}

export default function LogDrinkScreen() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState(DRINK_TYPES[0]);
  const [drinkName, setDrinkName] = useState('');
  const [volume, setVolume] = useState('375');
  const [abv, setAbv] = useState('5');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<DrinkPreset[]>([]);

  useEffect(() => {
    if (user) {
      supabase
        .from('drink_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('name')
        .then(({ data }) => { if (data) setPresets(data); });
    }
  }, [user]);

  function selectType(type: typeof DRINK_TYPES[0]) {
    setSelectedType(type);
    setVolume(String(type.defaultMl));
    setAbv(String(type.defaultAbv));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function applyPreset(preset: DrinkPreset) {
    const type = DRINK_TYPES.find(t => t.key === preset.drink_type) ?? DRINK_TYPES[0];
    setSelectedType(type);
    setDrinkName(preset.name);
    setVolume(String(preset.volume_ml));
    setAbv(String(preset.abv_percent));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const volNum = parseFloat(volume) || 0;
  const abvNum = parseFloat(abv) || 0;
  const standardDrinks = calcStandardDrinks(volNum, abvNum);

  async function handleLog() {
    if (!user) return;
    if (volNum <= 0 || abvNum <= 0) {
      Alert.alert('Invalid values', 'Please enter valid volume and ABV.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('drink_logs').insert({
      user_id: user.id,
      drink_name: drinkName.trim() || selectedType.label,
      drink_type: selectedType.key,
      volume_ml: volNum,
      abv_percent: abvNum,
      standard_drinks: standardDrinks,
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Drink logged! 🍺',
        `${standardDrinks.toFixed(2)} standard drinks added.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    }
  }

  async function saveAsPreset() {
    if (!user) return;
    const name = drinkName.trim() || selectedType.label;
    const { error } = await supabase.from('drink_presets').insert({
      user_id: user.id,
      name,
      drink_type: selectedType.key,
      volume_ml: volNum,
      abv_percent: abvNum,
      standard_drinks: standardDrinks,
    });
    if (!error) {
      const { data } = await supabase.from('drink_presets').select('*').eq('user_id', user.id).order('name');
      if (data) setPresets(data);
      Alert.alert('Saved!', `"${name}" saved as a preset.`);
    }
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Log a Drink</Text>

          {/* Drink type selector */}
          <Text style={styles.sectionLabel}>Drink type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {DRINK_TYPES.map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeChip, selectedType.key === type.key && styles.typeChipActive]}
                onPress={() => selectType(type)}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={[styles.typeLabel, selectedType.key === type.key && styles.typeLabelActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Presets */}
          {presets.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>My presets</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {presets.map((p) => (
                  <TouchableOpacity key={p.id} style={styles.presetChip} onPress={() => applyPreset(p)}>
                    <Text style={styles.presetText}>{p.name}</Text>
                    <Text style={styles.presetSub}>{p.standard_drinks.toFixed(1)} std</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Drink name */}
          <Text style={styles.sectionLabel}>Drink name (optional)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={`e.g. "Heineken 330ml"`}
              placeholderTextColor="#444466"
              value={drinkName}
              onChangeText={setDrinkName}
            />
          </View>

          {/* Volume & ABV */}
          <View style={styles.row}>
            <View style={styles.halfGroup}>
              <Text style={styles.sectionLabel}>Volume (ml)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={volume}
                  onChangeText={setVolume}
                  placeholder="375"
                  placeholderTextColor="#444466"
                />
              </View>
            </View>
            <View style={styles.halfGroup}>
              <Text style={styles.sectionLabel}>ABV (%)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={abv}
                  onChangeText={setAbv}
                  placeholder="5"
                  placeholderTextColor="#444466"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <Text style={styles.sectionLabel}>Notes (optional)</Text>
          <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
            <TextInput
              style={[styles.input, { textAlignVertical: 'top' }]}
              multiline
              placeholder="Where, with who, how you felt..."
              placeholderTextColor="#444466"
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          {/* Standard drinks preview */}
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Standard drinks</Text>
            <Text style={styles.previewValue}>{standardDrinks.toFixed(2)}</Text>
            <Text style={styles.previewNote}>
              Formula: {volNum}ml × {abvNum}% ABV × 0.789 ÷ 10
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.logButton, loading && { opacity: 0.6 }]}
            onPress={handleLog}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.logButtonText}>Log this drink</Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetButton} onPress={saveAsPreset}>
            <Ionicons name="bookmark-outline" size={18} color="#e94560" />
            <Text style={styles.presetButtonText}>Save as preset</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#888899', textTransform: 'uppercase', letterSpacing: 0.5 },
  typeScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  typeChip: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
    marginRight: 8, minWidth: 72,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  typeChipActive: { backgroundColor: 'rgba(233,69,96,0.2)', borderColor: '#e94560' },
  typeEmoji: { fontSize: 22, marginBottom: 4 },
  typeLabel: { fontSize: 12, color: '#888899', fontWeight: '600' },
  typeLabelActive: { color: '#e94560' },
  presetChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  presetText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  presetSub: { fontSize: 11, color: '#666688', marginTop: 2 },
  inputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, height: 50,
    justifyContent: 'center',
  },
  input: { color: '#fff', fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  halfGroup: { flex: 1, gap: 8 },
  preview: {
    backgroundColor: 'rgba(233,69,96,0.1)',
    borderRadius: 14, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(233,69,96,0.3)',
  },
  previewLabel: { fontSize: 12, color: '#e94560', fontWeight: '600', textTransform: 'uppercase' },
  previewValue: { fontSize: 42, fontWeight: '900', color: '#e94560' },
  previewNote: { fontSize: 12, color: '#a06070', marginTop: 4 },
  logButton: {
    backgroundColor: '#e94560', borderRadius: 14, height: 54,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4,
  },
  logButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  presetButton: {
    borderRadius: 14, height: 50, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(233,69,96,0.4)',
  },
  presetButtonText: { color: '#e94560', fontSize: 15, fontWeight: '600' },
});
