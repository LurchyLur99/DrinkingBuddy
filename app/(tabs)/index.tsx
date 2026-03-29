import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { DrinkLog } from '@/types/database';

function getStartOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getStartOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const [todayDrinks, setTodayDrinks] = useState<DrinkLog[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    if (!user) return;

    const [todayRes, weekRes] = await Promise.all([
      supabase
        .from('drink_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('logged_at', getStartOfDay())
        .order('logged_at', { ascending: false }),
      supabase
        .from('drink_logs')
        .select('standard_drinks')
        .eq('user_id', user.id)
        .gte('logged_at', getStartOfWeek()),
    ]);

    if (todayRes.data) setTodayDrinks(todayRes.data);
    if (weekRes.data) {
      setWeeklyTotal(weekRes.data.reduce((sum, d) => sum + d.standard_drinks, 0));
    }
    setLoading(false);
    setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { fetchData(); }, [user]));

  const todayTotal = todayDrinks.reduce((sum, d) => sum + d.standard_drinks, 0);
  const dailyLimit = profile?.daily_limit ?? 4;
  const weeklyLimit = profile?.weekly_limit ?? 14;
  const dailyPct = Math.min(todayTotal / dailyLimit, 1);
  const weeklyPct = Math.min(weeklyTotal / weeklyLimit, 1);

  function getLimitColor(pct: number) {
    if (pct < 0.6) return '#27ae60';
    if (pct < 0.85) return '#f39c12';
    return '#e94560';
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#e94560" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.name}>{profile?.username ?? 'Buddy'} 🍺</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color="#e94560" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Limit cards */}
            <View style={styles.cards}>
              <LimitCard
                label="Today"
                current={todayTotal}
                limit={dailyLimit}
                pct={dailyPct}
                color={getLimitColor(dailyPct)}
              />
              <LimitCard
                label="This week"
                current={weeklyTotal}
                limit={weeklyLimit}
                pct={weeklyPct}
                color={getLimitColor(weeklyPct)}
              />
            </View>

            {/* Status message */}
            <StatusBanner pct={dailyPct} total={todayTotal} limit={dailyLimit} />

            {/* Today's drinks */}
            <Text style={styles.sectionTitle}>Today's drinks</Text>
            {todayDrinks.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="beer-outline" size={48} color="#333355" />
                <Text style={styles.emptyText}>No drinks logged today</Text>
                <Text style={styles.emptySubtext}>Tap "Log Drink" to get started</Text>
              </View>
            ) : (
              todayDrinks.map((d) => <DrinkItem key={d.id} drink={d} />)
            )}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function LimitCard({ label, current, limit, pct, color }: {
  label: string; current: number; limit: number; pct: number; color: string;
}) {
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>{label}</Text>
      <Text style={[cardStyles.value, { color }]}>
        {current.toFixed(1)}<Text style={cardStyles.limit}>/{limit}</Text>
      </Text>
      <Text style={cardStyles.unit}>standard drinks</Text>
      <View style={cardStyles.barBg}>
        <View style={[cardStyles.barFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function StatusBanner({ pct, total, limit }: { pct: number; total: number; limit: number }) {
  let icon: string, message: string, color: string;
  if (pct === 0) {
    icon = '😊'; message = 'You haven\'t had anything yet. Drink responsibly!'; color = '#27ae60';
  } else if (pct < 0.6) {
    icon = '👍'; message = `Tracking well — ${(limit - total).toFixed(1)} standard drinks remaining today.`; color = '#27ae60';
  } else if (pct < 0.85) {
    icon = '⚠️'; message = `Getting close to your daily limit. Pace yourself!`; color = '#f39c12';
  } else if (pct < 1) {
    icon = '🛑'; message = `Almost at your daily limit. Consider stopping soon.`; color = '#e94560';
  } else {
    icon = '🚨'; message = `You've reached your daily limit. Please stop drinking.`; color = '#e94560';
  }

  return (
    <View style={[bannerStyles.banner, { borderColor: color + '44' }]}>
      <Text style={bannerStyles.icon}>{icon}</Text>
      <Text style={[bannerStyles.text, { color }]}>{message}</Text>
    </View>
  );
}

function DrinkItem({ drink }: { drink: DrinkLog }) {
  const time = new Date(drink.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={drinkStyles.item}>
      <View style={drinkStyles.left}>
        <Text style={drinkStyles.icon}>{drinkTypeEmoji(drink.drink_type)}</Text>
        <View>
          <Text style={drinkStyles.name}>{drink.drink_name}</Text>
          <Text style={drinkStyles.meta}>{drink.volume_ml}ml · {drink.abv_percent}% ABV · {time}</Text>
        </View>
      </View>
      <View style={drinkStyles.badge}>
        <Text style={drinkStyles.badgeText}>{drink.standard_drinks.toFixed(1)}</Text>
        <Text style={drinkStyles.badgeLabel}>std</Text>
      </View>
    </View>
  );
}

function drinkTypeEmoji(type: string) {
  const map: Record<string, string> = {
    beer: '🍺', wine: '🍷', spirit: '🥃', cocktail: '🍹',
    cider: '🍎', champagne: '🥂', other: '🫗',
  };
  return map[type] ?? '🍶';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 30, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  greeting: { fontSize: 16, color: '#a0a0b0' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff' },
  cards: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, color: '#555577', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#444466' },
});

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: { fontSize: 12, color: '#777799', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 28, fontWeight: '800' },
  limit: { fontSize: 16, color: '#555577' },
  unit: { fontSize: 11, color: '#555577' },
  barBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8 },
  barFill: { height: 4, borderRadius: 2 },
});

const bannerStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  icon: { fontSize: 20 },
  text: { flex: 1, fontSize: 14, lineHeight: 20 },
});

const drinkStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { fontSize: 28 },
  name: { fontSize: 15, fontWeight: '600', color: '#fff' },
  meta: { fontSize: 12, color: '#666688', marginTop: 2 },
  badge: { alignItems: 'center', backgroundColor: 'rgba(233,69,96,0.15)', borderRadius: 8, padding: 8 },
  badgeText: { fontSize: 18, fontWeight: '800', color: '#e94560' },
  badgeLabel: { fontSize: 10, color: '#e94560' },
});
