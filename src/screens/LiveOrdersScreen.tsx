import React, { useEffect, useMemo, useRef, useState } from 'react';
import OrderDetailScreen, { OrderDetail } from './OrderDetailScreen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
} from 'react-native';
import {
  fetchLiveOrders,
  fetchOrderById,
  fetchOrdersByDate,
} from '../services/ordersService';
import { useAuth } from '../context/AuthContext';

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const statusParam =
          tab === 'new'
            ? 'pending'
            : tab === 'in-progress'
            ? 'processing'
            : 'completed';
        const apiOrders = await fetchLiveOrders({
          status: statusParam,
          startDate: dateStr,
          endDate: dateStr,
        });
        console.log('apiOrders', apiOrders);
        console.log('dateStr', dateStr);
        const mapped: Order[] = apiOrders.map(o => ({
          id: o.id,
          customer:
            o.user?.firstName || o.user?.lastName
              ? `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.trim()
              : o.user?.email || 'Customer',
          type:
            o.orderType === 'delivery' || o.deliveryMethod === 'delivery'
              ? 'delivery'
              : 'collection',
          total: o.finalTotal ?? o.total ?? 0,
          etaMins: o.estimatedTimeToComplete ?? 20,
          status: tab,
        }));
        setOrders(mapped);
      } catch (e: any) {
        setError(
          e?.response?.data?.message || e?.message || 'Failed to load orders',
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

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

  const [counts, setCounts] = useState({ new: 0, inProgress: 0, complete: 0 });

  useEffect(() => {
    const computeCounts = async () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      try {
        const allOrders = await fetchOrdersByDate(dateStr, dateStr);
        setCounts({
          new: allOrders.filter(o => o.status === 'pending').length,
          inProgress: allOrders.filter(o => o.status === 'processing').length,
          complete: allOrders.filter(o => o.status === 'completed').length,
        });
      } catch (e) {
        // ignore counts error
      }
    };
    computeCounts();
  }, [tab]);

  // Map lightweight list item to detailed shape expected by OrderDetailScreen
  const toOrderDetail = (o: Order): OrderDetail => ({
    id: o.id,
    orderNumber: `DTB001-${o.id}`,
    createdAt: new Date().toLocaleString(),
    items: [{ id: 'x1', name: 'Set Meal', qty: 1, price: o.total }],
    total: o.total,
    type: o.type,
    payment: {
      method: 'card',
      status: tab === 'complete' ? 'paid' : 'pending',
    },
    customer: { name: o.customer },
  });

  const renderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={async () => {
        try {
          setDetailLoading(true);
          setError('');
          setSelected(item);
          const branchId = (user as any)?.branch?.id || (user as any)?.branchId;
          const full = await fetchOrderById(item.id, branchId);
          setSelectedDetail(full);
        } catch (e: any) {
          setError(
            e?.response?.data?.message || e?.message || 'Failed to load order',
          );
        } finally {
          setDetailLoading(false);
        }
      }}
    >
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {selectedDetail ? (
        <OrderDetailScreen
          stage={tab}
          order={selectedDetail}
          onBack={() => {
            setSelected(null);
            setSelectedDetail(null);
          }}
        />
      ) : (
        <>
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
          {!!error && (
            <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: '#ef4444' }}>{error}</Text>
            </View>
          )}
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
                setTypeFilter(prev =>
                  prev === 'delivery' ? 'all' : 'delivery',
                )
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
              <Text
                style={[styles.tabText, tab === 'new' && styles.tabTextActive]}
              >
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
                style={[
                  styles.tabText,
                  tab === 'complete' && styles.tabTextActive,
                ]}
              >
                Complete ({counts.complete})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          {loading ? (
            <View style={{ padding: 16 }}>
              <Text>Loading…</Text>
            </View>
          ) : detailLoading ? (
            <View style={{ padding: 16 }}>
              <Text>Loading order…</Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={it => it.id}
              renderItem={renderItem}
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingBottom: 16,
              }}
            />
          )}
        </>
      )}
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
