import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
} from 'react-native';

type Order = {
  id: string;
  customer: string;
  type: 'delivery' | 'collection';
  total: number;
  etaMins: number;
  status: 'new' | 'in-progress' | 'complete';
};

interface Props {
  onBack: () => void;
}

export default function LiveOrdersScreen({ onBack }: Props) {
  const [tab, setTab] = useState<'new' | 'in-progress' | 'complete'>('new');
  const [orders, setOrders] = useState<Order[]>([]);
  const pulse = useRef(new Animated.Value(0)).current;
  const [typeFilter, setTypeFilter] = useState<
    'all' | 'collection' | 'delivery' | 'table'
  >('all');

  useEffect(() => {
    // TODO: replace with socket/api feed
    setOrders([
      {
        id: '1',
        customer: 'Sachin T',
        type: 'collection',
        total: 55.0,
        etaMins: 20,
        status: 'new',
      },
      {
        id: '2',
        customer: 'MSD J',
        type: 'collection',
        total: 55.0,
        etaMins: 20,
        status: 'new',
      },
      {
        id: '3',
        customer: 'df feg',
        type: 'collection',
        total: 15.9,
        etaMins: 20,
        status: 'new',
      },
      {
        id: '4',
        customer: 'fd dgd',
        type: 'delivery',
        total: 19.95,
        etaMins: 45,
        status: 'new',
      },
      {
        id: '5',
        customer: 'ggd dfgfg',
        type: 'delivery',
        total: 22.95,
        etaMins: 45,
        status: 'new',
      },
    ]);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const filtered = useMemo(
    () =>
      orders
        .filter(o => o.status === tab)
        .filter(o =>
          typeFilter === 'all'
            ? true
            : typeFilter === 'table'
            ? false
            : o.type === typeFilter,
        ),
    [orders, tab, typeFilter],
  );

  const counts = useMemo(
    () => ({
      new: orders.filter(o => o.status === 'new').length,
      inProgress: orders.filter(o => o.status === 'in-progress').length,
      complete: orders.filter(o => o.status === 'complete').length,
    }),
    [orders],
  );

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.customer}>{item.customer}</Text>
        <Text style={styles.subtext}>
          {item.type === 'delivery' ? 'Delivery' : 'Collection'}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.total}>£{item.total.toFixed(2)}</Text>
        <Text style={styles.eta}>• {item.etaMins} mins</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Orders</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.menu}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Animated.Text
          style={[
            styles.liveDot,
            {
              opacity: pulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        >
          ● Online
        </Animated.Text>
      </View>
      {/* Filters */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[
            styles.filterChip,
            typeFilter === 'collection' && styles.filterChipActive,
          ]}
          onPress={() =>
            setTypeFilter(prev =>
              prev === 'collection' ? 'all' : 'collection',
            )
          }
        >
          <Text
            style={[
              styles.filterText,
              typeFilter === 'collection' && styles.filterTextActive,
            ]}
          >
            Collection
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            typeFilter === 'delivery' && styles.filterChipActive,
          ]}
          onPress={() =>
            setTypeFilter(prev => (prev === 'delivery' ? 'all' : 'delivery'))
          }
        >
          <Text
            style={[
              styles.filterText,
              typeFilter === 'delivery' && styles.filterTextActive,
            ]}
          >
            Delivery
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterChip,
            typeFilter === 'table' && styles.filterChipActive,
          ]}
          onPress={() =>
            setTypeFilter(prev => (prev === 'table' ? 'all' : 'table'))
          }
        >
          <Text
            style={[
              styles.filterText,
              typeFilter === 'table' && styles.filterTextActive,
            ]}
          >
            Table Ordering
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'new' && styles.tabActive]}
          onPress={() => setTab('new')}
        >
          <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>
            New ({counts.new})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'in-progress' && styles.tabActive]}
          onPress={() => setTab('in-progress')}
        >
          <Text
            style={[
              styles.tabText,
              tab === 'in-progress' && styles.tabTextActive,
            ]}
          >
            In Progress ({counts.inProgress})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'complete' && styles.tabActive]}
          onPress={() => setTab('complete')}
        >
          <Text
            style={[styles.tabText, tab === 'complete' && styles.tabTextActive]}
          >
            Complete ({counts.complete})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={it => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  menu: { fontSize: 18, paddingRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  liveDot: { color: '#16a34a', fontWeight: '600' },
  filtersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  filterChip: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eab308',
  },
  filterChipActive: { backgroundColor: '#eab308' },
  filterText: { color: '#eab308', fontWeight: '700' },
  filterTextActive: { color: '#ffffff' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff7ed' },
  tabText: { color: '#6b7280', fontWeight: '600' },
  tabTextActive: { color: '#111827' },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  customer: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  subtext: { color: '#6b7280' },
  total: { fontWeight: '700', fontSize: 16 },
  eta: { color: '#16a34a', marginTop: 4 },
});
