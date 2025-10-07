import React, { memo, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { printOrder } from '../services/printService';

type Stage = 'new' | 'in-progress' | 'complete';

export type OrderDetail = {
  id: string;
  orderNumber?: string;
  createdAt?: string;
  customer?: { name?: string; email?: string; phone?: string };
  items: Array<{
    id: string;
    name: string;
    qty: number;
    price: number;
    notes?: string;
    attributes?: Array<{
      attributeName: string;
      selectedItems: Array<{
        itemName: string;
        itemPrice?: number;
        quantity?: number;
      }>;
    }>;
  }>;
  serviceCharge?: number;
  subtotal?: number;
  total: number;
  type: 'delivery' | 'collection';
  payment?: { method?: string; status?: string };
};

interface Props {
  order: OrderDetail | any;
  stage: Stage;
  onBack: () => void;
  onDelayPress?: () => void;
  onCancelPress?: () => void;
  onAcceptPress?: () => void;
  onReadyPress?: () => void;
}

export default function OrderDetailScreen({
  order,
  stage,
  onBack,
  onDelayPress,
  onCancelPress,
  onAcceptPress,
  onReadyPress,
}: Props) {
  const onPrint = async () => {
    try {
      await printOrder(order);
      Alert.alert('Print', 'Receipt sent to printer');
    } catch (e: any) {
      Alert.alert('Print error', e?.message || 'Failed to print');
    }
  };
  const onAccept = () =>
    onAcceptPress ? onAcceptPress() : Alert.alert('Accept', 'Order accepted');
  const onReject = () =>
    onCancelPress ? onCancelPress() : Alert.alert('Reject', 'Order rejected');
  const onReady = () =>
    onReadyPress ? onReadyPress() : Alert.alert('Ready', 'Order marked ready');
  const onCancel = () =>
    onCancelPress ? onCancelPress() : Alert.alert('Cancel', 'Order cancelled');
  const onDelay = () =>
    onDelayPress
      ? onDelayPress()
      : Alert.alert('Delay', 'Delay flow coming soon');

  // Normalize items from order.items OR backend products[]
  const items = useMemo(() => {
    if (Array.isArray(order.items) && order.items.length) return order.items;
    if (Array.isArray(order.products)) {
      return order.products.map((p: any) => ({
        id: p.id || p._id || String(Math.random()),
        name: p.product?.name || p.name,
        qty: p.quantity ?? p.qty ?? 1,
        price: Number(p.itemTotal ?? p.price?.total ?? p.price ?? 0),
        notes: p.notes,
        attributes: Array.isArray(p.selectedAttributes)
          ? p.selectedAttributes.map((a: any) => ({
              attributeName: a.attributeName,
              selectedItems: (a.selectedItems || []).map((si: any) => ({
                itemName: si.itemName,
                itemPrice: si.itemPrice,
                quantity: si.quantity,
              })),
            }))
          : undefined,
      }));
    }
    return [];
  }, [order]);

  // Totals and charges
  const totals = useMemo(() => {
    const discount = Number(
      order?.discountApplied?.discountAmount ??
        order?.discount?.discountAmount ??
        0,
    );
    const tips = Number(order?.tips ?? 0);
    const deliveryFee = Number(order?.deliveryFee ?? 0);
    const tax = Number(order?.tax ?? 0);
    const serviceCharge = Number(
      order?.serviceCharge ?? order?.serviceCharges?.totalAll ?? 0,
    );
    const subtotal = Number(order?.subtotal ?? order?.totalAmount ?? 0);
    const total = Number(order?.finalTotal ?? order?.total ?? 0);
    return { discount, tips, deliveryFee, tax, serviceCharge, subtotal, total };
  }, [order]);

  const totalRows = useMemo(
    () => ({
      serviceCharge:
        typeof order?.serviceCharge === 'number'
          ? order.serviceCharge
          : totals.serviceCharge || undefined,
      subtotal:
        typeof order?.subtotal === 'number' ? order.subtotal : totals.subtotal,
      total: totals.total,
    }),
    [order?.serviceCharge, order?.subtotal, totals],
  );

  return (
    <View style={styles.container}>
      <Header
        orderNumber={order.orderNumber || order.id}
        createdAt={order.createdAt}
        onBack={onBack}
      />
      {/* Top actions */}
      <View style={styles.actionsTop}>
        <ActionBar
          stage={stage}
          onPrint={onPrint}
          onAccept={onAccept}
          onReject={onReject}
          onReady={onReady}
          onCancel={onCancel}
          onDelay={onDelay}
        />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <PaymentBlock
          type={
            (order.orderType || order.deliveryMethod) === 'delivery'
              ? 'delivery'
              : 'collection'
          }
          method={order.payment?.method || order.paymentMethod}
          status={order.payment?.status || order.paymentStatus}
        />

        <ItemsBlock
          items={items}
          totals={totalRows}
          extras={totals}
          type={
            (order.orderType || order.deliveryMethod) === 'delivery'
              ? 'delivery'
              : 'collection'
          }
        />

        {order.customerNotes ? (
          <View style={styles.block}>
            <Text style={styles.sectionTitle}>Customer Notes</Text>
            <Text style={styles.sub}>{order.customerNotes}</Text>
          </View>
        ) : null}

        {order.user || order.customer ? (
          <CustomerBlock
            name={
              order.user?.firstName
                ? `${order.user.firstName} ${order.user.lastName || ''}`.trim()
                : order.customer?.name
            }
            email={order.user?.email || order.customer?.email}
            phone={order.user?.phone || order.customer?.phone}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

// UI blocks
const Header = memo(
  ({
    orderNumber,
    createdAt,
    onBack,
  }: {
    orderNumber: string;
    createdAt?: string;
    onBack: () => void;
  }) => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Order No: {orderNumber}</Text>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
      </View>
      {createdAt ? (
        <Text style={styles.timestamp}>
          {new Date(createdAt).toLocaleString()}
        </Text>
      ) : null}
    </>
  ),
);

const PaymentBlock = memo(
  ({
    type,
    method,
    status,
  }: {
    type: 'delivery' | 'collection';
    method?: string;
    status?: string;
  }) => (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>
        {type === 'delivery' ? 'Delivery' : 'Collection'}
      </Text>
      <Text style={styles.sub}>{`Payment: ${method || '-'} (${
        status || '-'
      })`}</Text>
    </View>
  ),
);

const ItemsBlock = memo(
  ({
    items,
    totals,
    extras,
    type,
  }: {
    items: OrderDetail['items'];
    totals: { serviceCharge?: number; subtotal?: number; total: number };
    extras: {
      discount: number;
      tips: number;
      deliveryFee: number;
      tax: number;
      serviceCharge: number;
      subtotal: number;
      total: number;
    };
    type: 'delivery' | 'collection';
  }) => (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>Items</Text>

      {items.map(it => (
        <View key={it.id} style={{ paddingBottom: 8 }}>
          <Row
            left={it.name}
            right={`Qty: ${it.qty}   £${it.price.toFixed(2)}`}
          />
          {Array.isArray(it.attributes) && it.attributes.length > 0 ? (
            <View style={{ paddingLeft: 8, paddingTop: 4 }}>
              {it.attributes.map((attr, idx) => (
                <View key={idx} style={{ paddingVertical: 2 }}>
                  <Text style={styles.subtle}>{attr.attributeName}</Text>
                  {(attr.selectedItems || []).map((si, j) => (
                    <Row
                      key={j}
                      left={`  • ${si.itemName}`}
                      right={`£${Number(si.itemPrice || 0).toFixed(2)}`}
                    />
                  ))}
                </View>
              ))}
            </View>
          ) : null}
          {it.notes ? (
            <Text style={[styles.subtle, { paddingLeft: 8, paddingTop: 2 }]}>
              {it.notes}
            </Text>
          ) : null}
        </View>
      ))}

      {extras.discount ? (
        <Row
          left={<Text style={styles.subtle}>Discount</Text>}
          right={`-£${extras.discount.toFixed(2)}`}
        />
      ) : null}
      {extras.tips ? (
        <Row
          left={<Text style={styles.subtle}>Tip</Text>}
          right={`£${extras.tips.toFixed(2)}`}
        />
      ) : null}
      {extras.deliveryFee && type === 'delivery' ? (
        <Row
          left={<Text style={styles.subtle}>Delivery Fee</Text>}
          right={`£${extras.deliveryFee.toFixed(2)}`}
        />
      ) : null}
      {extras.tax ? (
        <Row
          left={<Text style={styles.subtle}>Tax</Text>}
          right={`£${extras.tax.toFixed(2)}`}
        />
      ) : null}
      {typeof totals.serviceCharge === 'number' ? (
        <Row
          left={<Text style={styles.subtle}>Service Charge</Text>}
          right={`£${Number(totals.serviceCharge).toFixed(2)}`}
        />
      ) : null}
      {typeof totals.subtotal === 'number' ? (
        <Row
          left={<Text style={styles.bold}>Subtotal</Text>}
          right={
            <Text style={styles.bold}>
              £{Number(totals.subtotal).toFixed(2)}
            </Text>
          }
        />
      ) : null}
      <Row
        style={styles.totalRow}
        left={<Text style={styles.total}>Total</Text>}
        right={
          <Text style={styles.total}>£{Number(totals.total).toFixed(2)}</Text>
        }
      />
    </View>
  ),
);

const CustomerBlock = memo(
  ({
    name,
    email,
    phone,
  }: {
    name?: string;
    email?: string;
    phone?: string;
  }) => (
    <View style={styles.block}>
      <Text style={styles.sectionTitle}>{name || 'Customer'}</Text>
      {email ? <Text style={styles.sub}>{email}</Text> : null}
      {phone ? <Text style={styles.sub}>{phone}</Text> : null}
    </View>
  ),
);

const ActionBar = memo(
  ({
    stage,
    onPrint,
    onAccept,
    onReject,
    onReady,
    onCancel,
    onDelay,
  }: {
    stage: Stage;
    onPrint: () => void;
    onAccept: () => void;
    onReject: () => void;
    onReady: () => void;
    onCancel: () => void;
    onDelay: () => void;
  }) => (
    <View style={styles.actions}>
      {/* Common Delay button */}
      <TouchableOpacity
        style={[styles.btn, styles.btnOutline]}
        onPress={onDelay}
      >
        <Text style={styles.btnOutlineText}>Delay</Text>
      </TouchableOpacity>

      {stage === 'new' ? (
        <>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, styles.btnDangerOutline]}
            onPress={onReject}
          >
            <Text style={[styles.btnOutlineText, styles.btnDangerOutlineText]}>
              Reject
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onAccept}
          >
            <Text style={styles.btnPrimaryText}>Accept</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {stage === 'in-progress' ? (
        <>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onReady}
          >
            <Text style={styles.btnPrimaryText}>Ready</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, styles.btnDangerOutline]}
            onPress={onCancel}
          >
            <Text style={[styles.btnOutlineText, styles.btnDangerOutlineText]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline]}
            onPress={onPrint}
          >
            <Text style={styles.btnOutlineText}>Print Order</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {stage === 'complete' ? (
        <TouchableOpacity
          style={[styles.btn, styles.btnOutline]}
          onPress={onPrint}
        >
          <Text style={styles.btnOutlineText}>Print Order</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ),
);

const Row = memo(
  ({
    left,
    right,
    style: styleProp,
  }: {
    left: React.ReactNode;
    right: React.ReactNode;
    style?: any;
  }) => (
    <View style={[styles.itemRow, styleProp]}>
      {typeof left === 'string' ? (
        <Text style={styles.itemName}>{left}</Text>
      ) : (
        left
      )}
      {typeof right === 'string' ? (
        <Text style={styles.itemRight}>{right}</Text>
      ) : (
        right
      )}
    </View>
  ),
);

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
  actionsTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  title: { fontSize: 18, fontWeight: '700', flex: 1 },
  back: { color: '#2563eb' },
  timestamp: { color: '#6b7280', paddingHorizontal: 12, paddingTop: 4 },
  block: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 8,
    borderColor: '#f9fafb',
  },
  blockTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#6b7280' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  itemName: { color: '#111827' },
  itemRight: { color: '#111827' },
  bold: { fontWeight: '700' },
  subtle: { color: '#6b7280' },
  totalRow: { borderTopWidth: 1, borderColor: '#e5e7eb' },
  total: { color: '#059669', fontWeight: '700' },
  actions: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    width: '20%',
    alignItems: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: '#6b7280',
    width: '20%',
    alignItems: 'center',
  },
  btnOutlineText: { color: '#374151', fontWeight: '600' },
  btnPrimary: {
    backgroundColor: '#059669',
    width: '20%',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#ffffff', fontWeight: '700' },
  btnDangerOutline: { borderColor: '#ef4444' },
  btnDangerOutlineText: { color: '#ef4444' },
});
