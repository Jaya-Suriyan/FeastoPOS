import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

interface Props {
  onLogout: () => void;
  onLiveOrders?: () => void;
}

export default function DashboardScreen({ onLogout, onLiveOrders }: Props) {
  const { user } = useAuth();
  const displayName =
    user?.firstName || user?.lastName
      ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
      : user?.email ?? '';
  const branchName = user?.branch?.name || '';
  const handleLiveOrders = () => {
    onLiveOrders && onLiveOrders();
  };

  const handleRecords = () => {
    // TODO: navigate to Records/Reports screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      {!!displayName || !!branchName ? (
        <Text style={styles.subtitle}>
          {displayName}
          {displayName && branchName ? ' — ' : ''}
          {branchName}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.card, styles.primary]}
          onPress={handleLiveOrders}
        >
          <Text style={styles.cardTitle}>Live Orders</Text>
          <Text style={styles.cardText}>View current orders</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.card, styles.secondary]}
          onPress={handleRecords}
        >
          <Text style={styles.cardTitle}>Records</Text>
          <Text style={styles.cardText}>Order history</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onLogout} style={styles.logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#374151',
    marginTop: -8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  primary: {
    backgroundColor: '#dcfce7',
  },
  secondary: {
    backgroundColor: '#e0e7ff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  cardText: {
    color: '#374151',
  },
  logout: {
    marginTop: 'auto',
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: {
    color: '#111827',
    fontWeight: '600',
  },
});
