import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useAuth } from '../context/AuthContext';
import { fetchOrdersByDate } from '../services/ordersService';
import RNPrint from 'react-native-print';
import { printOrders } from '../services/printService';

type OrderItem = {
  id: string;
  orderNumber: string;
  customer: string;
  type: 'delivery' | 'collection';
  status: string;
  total: number;
  createdAt?: string;
};

interface Props {
  onBack: () => void;
}

export default function OrderHistoryScreen({ onBack }: Props) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Date range selection with proper date picker
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const today = new Date();
  const [fromDate, setFromDate] = useState<Date>(today);
  const [toDate, setToDate] = useState<Date>(today);
  const [isFromPickerVisible, setIsFromPickerVisible] = useState(false);
  const [isToPickerVisible, setIsToPickerVisible] = useState(false);
  const [isPrintDialogVisible, setIsPrintDialogVisible] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeOrderNumber: true,
    includeCustomer: true,
    includeType: true,
    includeAmount: true,
    includeTime: false,
    includeStatus: false,
  });

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Normalize date order (earlier to later)
      const startDate =
        fromDate <= toDate ? formatDate(fromDate) : formatDate(toDate);
      const endDate =
        fromDate <= toDate ? formatDate(toDate) : formatDate(fromDate);
      const branchId = (user as any)?.branch?.id || (user as any)?.branchId;
      const all = await fetchOrdersByDate(startDate, endDate, branchId);
      const mapped: OrderItem[] = all.map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customer:
          o.user?.firstName || o.user?.lastName
            ? `${o.user?.firstName ?? ''} ${o.user?.lastName ?? ''}`.trim()
            : o.user?.email || 'Customer',
        type:
          o.orderType === 'delivery' || o.deliveryMethod === 'delivery'
            ? 'delivery'
            : 'collection',
        status: o.status,
        total: o.finalTotal ?? o.total ?? 0,
        createdAt: o.createdAt,
      }));
      setOrders(mapped);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderItem = ({ item }: { item: OrderItem }) => (
    <View
      style={[
        styles.card,
        item.type === 'delivery' ? styles.deliveryCard : styles.collectionCard,
      ]}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.orderNumber}>{item.orderNumber}</Text>
        <Text style={styles.customer}>{item.customer}</Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusBadge,
              item.status === 'completed'
                ? styles.statusCompleted
                : item.status === 'processing'
                ? styles.statusProcessing
                : item.status === 'pending'
                ? styles.statusPending
                : styles.statusCancelled,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.typeText}>
            {item.type.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.total}>£{item.total.toFixed(2)}</Text>
        {!!item.createdAt && (
          <Text style={styles.time}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order History</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.menu}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Filters: From/To */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          onPress={() => setIsFromPickerVisible(true)}
          style={styles.rangeChip}
        >
          <Text style={styles.rangeText}>From: {formatDate(fromDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsToPickerVisible(true)}
          style={styles.rangeChip}
        >
          <Text style={styles.rangeText}>To: {formatDate(toDate)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsPrintDialogVisible(true)}
          style={styles.printBtn}
          disabled={orders.length === 0}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Print</Text>
        </TouchableOpacity>
      </View>

      {!!error && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          <Text style={{ color: '#ef4444' }}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={{ padding: 16 }}>
          <Text>Loading…</Text>
        </View>
      ) : (
        <>
          {/* Total orders widget */}
          <View style={styles.summaryWidget}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Orders:</Text>
              <Text style={styles.summaryValue}>{orders.length}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Revenue:</Text>
              <Text style={styles.summaryValue}>
                £
                {orders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery:</Text>
              <Text style={[styles.summaryValue, styles.deliveryValue]}>
                {orders.filter(o => o.type === 'delivery').length}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Collection:</Text>
              <Text style={[styles.summaryValue, styles.collectionValue]}>
                {orders.filter(o => o.type === 'collection').length}
              </Text>
            </View>
          </View>
          <FlatList
            data={orders}
            keyExtractor={it => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 16 }}
            ListEmptyComponent={() => (
              <View style={{ padding: 16 }}>
                <Text>No orders found for selected range.</Text>
              </View>
            )}
          />
        </>
      )}

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={isFromPickerVisible}
        mode="date"
        onConfirm={date => {
          setFromDate(date);
          setIsFromPickerVisible(false);
        }}
        onCancel={() => setIsFromPickerVisible(false)}
        date={fromDate}
      />

      <DateTimePickerModal
        isVisible={isToPickerVisible}
        mode="date"
        onConfirm={date => {
          setToDate(date);
          setIsToPickerVisible(false);
        }}
        onCancel={() => setIsToPickerVisible(false)}
        date={toDate}
      />

      {/* Print Options Dialog */}
      <Modal
        visible={isPrintDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPrintDialogVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.printDialog}>
            <Text style={styles.dialogTitle}>Print Options</Text>
            <Text style={styles.dialogSubtitle}>
              Select columns to include:
            </Text>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeOrderNumber: !prev.includeOrderNumber,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Order Number</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeOrderNumber && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeOrderNumber && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeCustomer: !prev.includeCustomer,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Customer Name</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeCustomer && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeCustomer && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeType: !prev.includeType,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Order Type (D/C)</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeType && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeType && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeAmount: !prev.includeAmount,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Amount</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeAmount && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeAmount && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeTime: !prev.includeTime,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Time</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeTime && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeTime && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() =>
                  setPrintOptions(prev => ({
                    ...prev,
                    includeStatus: !prev.includeStatus,
                  }))
                }
              >
                <Text style={styles.optionLabel}>Status</Text>
                <View
                  style={[
                    styles.checkbox,
                    printOptions.includeStatus && styles.checkboxChecked,
                  ]}
                >
                  {printOptions.includeStatus && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.dialogButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsPrintDialogVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => {
                  setIsPrintDialogVisible(false);
                  printOrders(orders, { fromDate, toDate }, printOptions);
                }}
              >
                <Text style={styles.confirmBtnText}>Print</Text>
              </TouchableOpacity>
            </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  menu: { fontSize: 18, paddingRight: 8 },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  rangeChip: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rangeText: { color: '#111827', fontSize: 12 },
  refreshBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  printBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  deliveryCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  collectionCard: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  orderNumber: {
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 2,
    color: '#6b7280',
  },
  customer: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusProcessing: {
    backgroundColor: '#dbeafe',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
  },
  total: {
    fontWeight: '700',
    fontSize: 16,
    color: '#111827',
  },
  time: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  summaryWidget: {
    backgroundColor: '#f8fafc',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  deliveryValue: {
    color: '#f59e0b',
  },
  collectionValue: {
    color: '#3b82f6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  printDialog: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    textAlign: 'center',
  },
  dialogSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  optionLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  cancelBtnText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
