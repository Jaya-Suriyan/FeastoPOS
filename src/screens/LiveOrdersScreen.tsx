import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import OrderDetailScreen, { OrderDetail } from './OrderDetailScreen';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import {
  fetchLiveOrders,
  fetchOrderById,
  fetchOrdersByDate,
  updateOrderEstimatedTime,
  updateOrderStatus,
} from '../services/ordersService';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { playNewOrderSound } from '../utils/sound';

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
  // 0 = Today, 1 = Yesterday, 2 = Two days ago
  const [dateOffset, setDateOffset] = useState<0 | 1 | 2>(0);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const { user } = useAuth();
  const { onOrderEvent, offOrderEvent, isConnected } = useSocket();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);
  const [delayOpen, setDelayOpen] = useState(false);

  const getDateStr = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const refreshListForTab = async (silent?: boolean) => {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError('');
      const dateStr = getDateStr(dateOffset);
      const endDateStr = getDateStr(0);
      const statusParam =
        tab === 'new'
          ? 'pending'
          : tab === 'in-progress'
          ? 'processing'
          : 'completed';
      const apiOrders = await fetchLiveOrders({
        status: statusParam,
        startDate: dateStr,
        endDate: endDateStr,
      });
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
      if (!silent) {
        setError(
          e?.response?.data?.message || e?.message || 'Failed to load orders',
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const refreshCounts = async () => {
    try {
      const dateStr = getDateStr(dateOffset);
      const endDateStr = getDateStr(0);
      const branchId = (user as any)?.branch?.id || (user as any)?.branchId;
      const allOrders = await fetchOrdersByDate(dateStr, endDateStr, branchId);
      setCounts({
        new: allOrders.filter(o => o.status === 'pending').length,
        inProgress: allOrders.filter(o => o.status === 'processing').length,
        complete: allOrders.filter(o => o.status === 'completed').length,
      });
    } catch {}
  };

  const refreshAll = async (silent?: boolean) => {
    await Promise.all([refreshListForTab(silent), refreshCounts()]);
  };

  useEffect(() => {
    refreshAll();
  }, [tab, dateOffset]);

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

  // Subscribe to socket order events
  const handleOrderEvent = useCallback(
    (message: any) => {
      // Silent refresh on socket updates
      console.log('handleOrderEvent', message);
      try {
        if (
          message?.event === 'order_created' ||
          message?.type === 'order_created' ||
          message === 'order_created'
        ) {
          playNewOrderSound();
        }
      } catch {}
      refreshAll(true);
    },
    [refreshAll],
  );

  useEffect(() => {
    onOrderEvent(handleOrderEvent);
    return () => offOrderEvent(handleOrderEvent);
  }, [onOrderEvent, offOrderEvent, handleOrderEvent]);

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
      const dateStr = getDateStr(dateOffset);
      const endDateStr = getDateStr(0);
      try {
        const allOrders = await fetchOrdersByDate(dateStr, endDateStr);
        const filteredOrders = allOrders.filter(o =>
          typeFilter === 'all' ? true : o.orderType === typeFilter,
        );
        setCounts({
          new: filteredOrders.filter(o => o.status === 'pending').length,
          inProgress: filteredOrders.filter(o => o.status === 'processing')
            .length,
          complete: filteredOrders.filter(o => o.status === 'completed').length,
        });
      } catch (e) {
        // ignore counts error
      }
    };
    computeCounts();
  }, [tab, typeFilter, dateOffset]);

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
          onDelayPress={() => setDelayOpen(true)}
          onAcceptPress={async () => {
            if (!selectedDetail) return;
            try {
              setDetailLoading(true);
              await updateOrderStatus(selectedDetail.id, 'processing');
              const branchId =
                (user as any)?.branch?.id || (user as any)?.branchId;
              const fresh = await fetchOrderById(selectedDetail.id, branchId);
              setSelectedDetail(fresh);
              await refreshAll();
              setSelected(null);
              setSelectedDetail(null);
            } catch (e: any) {
              setError(
                e?.response?.data?.message ||
                  e?.message ||
                  'Failed to accept order',
              );
            } finally {
              setDetailLoading(false);
            }
          }}
          onReadyPress={async () => {
            if (!selectedDetail) return;
            try {
              setDetailLoading(true);
              await updateOrderStatus(selectedDetail.id, 'completed');
              const branchId =
                (user as any)?.branch?.id || (user as any)?.branchId;
              const fresh = await fetchOrderById(selectedDetail.id, branchId);
              setSelectedDetail(fresh);
              await refreshAll();
              setSelected(null);
              setSelectedDetail(null);
            } catch (e: any) {
              setError(
                e?.response?.data?.message ||
                  e?.message ||
                  'Failed to mark ready',
              );
            } finally {
              setDetailLoading(false);
            }
          }}
          onCancelPress={async () => {
            if (!selectedDetail) return;
            try {
              setDetailLoading(true);
              const confirmed = await new Promise<boolean>(resolve => {
                // Use built-in Alert for confirmation
                const RNAlert = require('react-native').Alert;
                RNAlert.alert(
                  'Cancel order',
                  'Are you sure you want to cancel this order?',
                  [
                    {
                      text: 'No',
                      style: 'cancel',
                      onPress: () => resolve(false),
                    },
                    {
                      text: 'Yes, cancel',
                      style: 'destructive',
                      onPress: () => resolve(true),
                    },
                  ],
                  { cancelable: true },
                );
              });
              if (!confirmed) return;
              await updateOrderStatus(selectedDetail.id, 'cancelled');
              const branchId =
                (user as any)?.branch?.id || (user as any)?.branchId;
              const fresh = await fetchOrderById(selectedDetail.id, branchId);
              setSelectedDetail(fresh);
              await refreshAll();
              // navigate back to list view after cancellation
              setSelected(null);
              setSelectedDetail(null);
            } catch (e: any) {
              setError(
                e?.response?.data?.message ||
                  e?.message ||
                  'Failed to cancel order',
              );
            } finally {
              setDetailLoading(false);
            }
          }}
          onBack={() => {
            setSelected(null);
            setSelectedDetail(null);
            refreshAll();
          }}
        />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Live Orders</Text>
            {/* Date dropdown */}
            <View>
              <TouchableOpacity
                onPress={() => setDateMenuOpen(true)}
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 12, color: '#111827' }}>
                  Start From:{' '}
                  {dateOffset === 0
                    ? 'Today'
                    : dateOffset === 1
                    ? 'Yesterday'
                    : 'Two days ago'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.menu}>Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.header}>
            <Animated.Text
              style={[
                styles.liveDot,
                {
                  color: isConnected ? '#16a34a' : '#ef4444',
                  opacity: isConnected
                    ? pulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.4, 1],
                      })
                    : 1,
                },
              ]}
            >
              ● {isConnected ? 'Online' : 'Offline'}
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

      {/* Delay modal */}
      <Modal
        visible={delayOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDelayOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              width: '88%',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>
              Delay this order
            </Text>
            <Text style={{ color: '#6b7280', marginBottom: 12 }}>
              How much additional time do you want to add to the estimated time?
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8,
                justifyContent: 'space-between',
              }}
            >
              {[5, 10, 15, 20, 25, 30, 35, 40, 50].map(min => (
                <TouchableOpacity
                  key={min}
                  style={{
                    backgroundColor: '#10b981',
                    paddingVertical: 12,
                    borderRadius: 8,
                    width: '30%',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                  onPress={async () => {
                    if (!selectedDetail) return;
                    try {
                      setDetailLoading(true);
                      const current = Number(
                        selectedDetail?.estimatedTimeToComplete || 0,
                      );
                      const next = current + min;
                      await updateOrderEstimatedTime(selectedDetail.id, next);
                      const branchId =
                        (user as any)?.branch?.id || (user as any)?.branchId;
                      const fresh = await fetchOrderById(
                        selectedDetail.id,
                        branchId,
                      );
                      setSelectedDetail(fresh);
                      await refreshAll();
                      setDelayOpen(false);
                    } catch (e: any) {
                      setError(
                        e?.response?.data?.message ||
                          e?.message ||
                          'Failed to update order',
                      );
                    } finally {
                      setDetailLoading(false);
                    }
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {min} mins
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              onPress={() => setDelayOpen(false)}
              style={{
                alignSelf: 'flex-end',
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date dropdown modal */}
      <Modal
        visible={dateMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDateMenuOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#ffffff',
              width: '80%',
              borderRadius: 12,
              paddingVertical: 8,
            }}
          >
            {[
              { label: 'Today', value: 0 },
              { label: 'Yesterday', value: 1 },
              { label: 'Two days ago', value: 2 },
            ].map(opt => (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => {
                  setDateOffset(opt.value as 0 | 1 | 2);
                  setDateMenuOpen(false);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 16 }}
              >
                <Text
                  style={{
                    color: opt.value === dateOffset ? '#111827' : '#374151',
                    fontWeight:
                      opt.value === dateOffset
                        ? ('700' as any)
                        : ('400' as any),
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
