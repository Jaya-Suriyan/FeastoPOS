import apiClient from '../lib/apiClient';

export type LiveOrder = {
  id: string;
  orderNumber?: string;
  status: string;
  total: number;
  finalTotal?: number;
  orderType?: 'collection' | 'delivery' | 'table';
  deliveryMethod?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt?: string;
  estimatedTimeToComplete?: number;
  user?: { firstName?: string; lastName?: string; email?: string };
};

export interface FetchLiveOrdersParams {
  status: string; // e.g., 'processing' | 'pending' | 'preparing'
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export async function fetchLiveOrders(params: FetchLiveOrdersParams): Promise<LiveOrder[]> {
  const res = await apiClient.get('/orders', { params });
  const data = res.data?.data ?? [];
  return (data as any[]).map((o) => ({
    ...o,
    id: o.id || o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.totalAmount ?? o.total ?? 0,
    finalTotal: o.finalTotal,
    orderType: (o.orderType || o.deliveryMethod) as any,
    deliveryMethod: o.deliveryMethod,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    estimatedTimeToComplete: o.estimatedTimeToComplete,
    user: o.user ? { firstName: o.user.firstName, lastName: o.user.lastName, email: o.user.email } : undefined,
  }));
}

export async function fetchOrderById(id: string, branchId?: string): Promise<any> {
  const res = await apiClient.get(`/orders/${id}`, {
    params: branchId ? { branchId } : undefined,
  });
  return res.data?.data;
}

export async function fetchOrdersByDate(startDate: string, endDate: string): Promise<LiveOrder[]> {
  const res = await apiClient.get('/orders', { params: { startDate, endDate } });
  const data = res.data?.data ?? [];
  return (data as any[]).map((o) => ({
    ...o,
    id: o.id || o._id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.totalAmount ?? o.total ?? 0,
    finalTotal: o.finalTotal,
    orderType: (o.orderType || o.deliveryMethod) as any,
    deliveryMethod: o.deliveryMethod,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    estimatedTimeToComplete: o.estimatedTimeToComplete,
    user: o.user ? { firstName: o.user.firstName, lastName: o.user.lastName, email: o.user.email } : undefined,
  }));
}


