import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DrinkLog } from '@/types/database';

type Period = '7d' | '30d' | '90d' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
];

function periodStart(p: Period): string | null {
  if (p === 'all') return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(p));
  return d.toISOString();
}

function groupByDate(drinks: DrinkLog[]): { date: string; drinks: DrinkLog[] }[] {
  const map = new Map<string, DrinkLog[]>();
  drinks.forEach((d) => {
    const key = new Date(d.logged_at).toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  });
  return Array.from(map.entries()).map(([date, drinks]) => ({ date, drinks }));
}

function drinkTypeEmoji(type: string) {
  const map: Record<string, string> = {
    beer: '🍺', wine: '🍷', spirit: '🥃', cocktail: '🍹',
    cider: '🍎', champagne: '🥂', other: '🫗',
  };
  return map[type] ?? '🍶';
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [drinks, setDrinks] = useState<DrinkLog[]>([]);
  const [period, setPeriod] = useState<Period>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchHistory(p = period) {
    if (!user) return;
    const start = periodStart(p);
    let query = supabase
      .from('drink_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });
    if (start) query = query.gte('logged_at', start);
    const { data } = await query;
    if (data) setDrinks(data);
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { fetchHistory(); }, [user, period]));

  async function deleteLog(id: string) {
    Alert.alert('Delete drink?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('drink_logs').delete().eq('id', id);
          setDrinks(prev => prev.filter(d => d.id !== id));
        },
      },
    ]);
  }

  const totalStd = drinks.reduce((s, d) => s + d.standard_drinks, 0);
  const avgPerDay = drinks.length > 0 && period !== 'all'
    ? totalStd / parseInt(period)
    : null;

  const groups = groupByDate(drinks);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>

        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodChip, period === p.key && styles.periodChipActive]}
              onPress={() => { setPeriod(p.key); setLoading(true); fetchHistory(p.key); }}
            >
              <Text style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary bar */}
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{totalStd.toFixed(1)}</Text>
            <Text style={styles.summaryLabel}>total std drinks</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{drinks.length}</Text>
            <Text style={styles.summaryLabel}>drinks logged</Text>
          </View>
          {avgPerDay !== null && (
            <>
              <View style={styles.divider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{avgPerDay.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>avg/day</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#e94560" style={{ marginTop: 40 }} />
      ) : drinks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={56} color="#333355" />
          <Text style={styles.emptyText}>No drinks in this period</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.date}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchHistory(); }}
              tintColor="#e94560"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupDate}>{item.date}</Text>
                <Text style={styles.groupTotal}>
                  {item.drinks.reduce((s, d) => s + d.standard_drinks, 0).toFixed(1)} std
                </Text>
              </View>
              {item.drinks.map((drink) => (
                <DrinkRow key={drink.id} drink={drink} onDelete={() => deleteLog(drink.id)} />
              ))}
            </View>
          )}
        />
      )}
    </LinearGradient>
  );
}

function DrinkRow({ drink, onDelete }: { drink: DrinkLog; onDelete: () => void }) {
  const time = new Date(drink.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.emoji}>{drinkTypeEmoji(drink.drink_type)}</Text>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{drink.drink_name}</Text>
        <Text style={rowStyles.meta}>{drink.volume_ml}ml · {drink.abv_percent}% · {time}</Text>
        {drink.notes ? <Text style={rowStyles.notes}>{drink.notes}</Text> : null}
      </View>
      <View style={rowStyles.right}>
        <Text style={rowStyles.std}>{drink.standard_drinks.toFixed(1)}</Text>
        <Text style={rowStyles.stdLabel}>std</Text>
        <TouchableOpacity onPress={onDelete} style={rowStyles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color="#444466" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  periodChipActive: { backgroundColor: 'rgba(233,69,96,0.2)', borderColor: '#e94560' },
  periodLabel: { fontSize: 13, color: '#888899', fontWeight: '600' },
  periodLabelActive: { color: '#e94560' },
  summary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 11, color: '#666688', marginTop: 2 },
  divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, color: '#555577' },
  list: { paddingHorizontal: 20, paddingBottom: 30, gap: 20 },
  group: { gap: 8 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 4 },
  groupDate: { fontSize: 14, fontWeight: '700', color: '#a0a0b0' },
  groupTotal: { fontSize: 13, color: '#e94560', fontWeight: '600' },
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: 12, gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emoji: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#fff' },
  meta: { fontSize: 12, color: '#666688', marginTop: 2 },
  notes: { fontSize: 12, color: '#555577', marginTop: 4, fontStyle: 'italic' },
  right: { alignItems: 'center', gap: 2 },
  std: { fontSize: 18, fontWeight: '800', color: '#e94560' },
  stdLabel: { fontSize: 10, color: '#e94560' },
  deleteBtn: { marginTop: 4, padding: 2 },
});
