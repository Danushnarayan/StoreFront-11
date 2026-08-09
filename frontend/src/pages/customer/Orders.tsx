import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Package, X, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOrders, useCancelOrder } from '../../hooks/useOrders';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton, OrderCardSkeleton } from '../../components/ui/Skeleton';
import type { Order } from '../../api/orderService';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { usePaymentsByOrder, useCreatePayment } from '../../hooks/usePayments';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../utils/currency';
import { safeFormatDate } from '../../utils/date';
import { generateInvoice } from '../../utils/generateInvoice';

/** Shortens an Order ID to a readable format like ORD-20260723...41f6 */
export function shortOrderId(id: string): string {
 if (!id || id.length < 12) return id;
 return`${id.substring(0, 8)}…${id.slice(-4)}`;
}

export default function Orders() {
 const { user } = useAuth();
 const { data: orders, isLoading, isError } = useOrders(user?.userId);
 const cancelOrderMutation = useCancelOrder(user?.userId);

 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const navigate = useNavigate();
 const createPaymentMutation = useCreatePayment();
 
 const { data: orderPayments, isLoading: isLoadingPayments } = usePaymentsByOrder(selectedOrder?.order_id);
 const latestPayment = orderPayments && orderPayments.length > 0 ? orderPayments[orderPayments.length - 1] : null;

 const handleContinuePayment = () => {
 if (!selectedOrder) return;
 
 const pendingPayment = orderPayments?.find(p => p.payment_status === 'PENDING');
 if (pendingPayment) {
 navigate(`/payment/${selectedOrder.order_id}`);
 return;
 }

 createPaymentMutation.mutate({
 order_id: selectedOrder.order_id,
 amount: Number(selectedOrder.total_amount)
 }, {
 onSuccess: () => {
 navigate(`/payment/${selectedOrder.order_id}`);
 },
 onError: (err: any) => {
 const msg = err.response?.data?.message || err.message || '';
 if (err.response?.status === 409 && (msg.toLowerCase().includes('expire') || msg.toLowerCase().includes('no longer'))) {
 toast.error("This payment session has expired. Please place a new order.");
 setSelectedOrder(prev => prev ? { ...prev, payment_status: 'EXPIRED'as any } : null);
 } else {
 toast.error(msg ||"Failed to initiate payment");
 }
 }
 });
 };

 if (isLoading) {
 return (
 <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
 <Skeleton className="h-10 w-48 mb-10 !bg-bg-card" />
 {[1, 2, 3].map(i => (
 <OrderCardSkeleton key={i} />
 ))}
 </div>
 );
 }

 if (isError) {
 return (
 <div className="max-w-3xl mx-auto px-4 py-16 text-center">
 <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
 <h2 className="text-xl font-bold text-text-primary mb-2">Failed to load orders</h2>
 <p className="text-text-secondary dark:text-text-secondary">Please try refreshing the page.</p>
 </div>
 );
 }

 if (!orders || orders.length === 0) {
 return (
 <div className="max-w-3xl mx-auto px-4 py-16">
 <EmptyState 
 icon={ShoppingBag}
 title="No orders yet"
 description="When you place orders, they will appear here."
 />
 </div>
 );
 }

 const handleCancel = (orderId: string, e: React.MouseEvent) => {
 e.stopPropagation();
 if (confirm('Are you sure you want to cancel this order?')) {
 cancelOrderMutation.mutate(orderId);
 if (selectedOrder?.order_id === orderId) {
 setSelectedOrder(prev => prev ? { ...prev, order_status: 'CANCELLED'} : null);
 }
 }
 };

 const sortedOrders = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

 return (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="max-w-3xl mx-auto px-4 py-16"
 >
 <h1 className="text-4xl font-playfair font-bold text-text-primary mb-10">My Orders</h1>
 
 {/* Left-aligned vertical timeline */}
 <div className="relative space-y-6 pl-10 before:absolute before:left-4 before:top-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border-subtle before:via-border-subtle before:to-transparent">
 {sortedOrders.map((order) => (
 <motion.div 
 whileHover={{ y: -2 }}
 key={order.order_id}
 className="relative"
 >
 {/* Timeline dot */}
 <div className="absolute -left-[26px] top-8 w-3 h-3 rounded-full border-2 border-primary bg-bg-primary z-10" />

 {/* Card */}
 <div
 onClick={() => setSelectedOrder(order)}
 className="bg-bg-card rounded-[28px] p-6 shadow-sm border border-border-subtle cursor-pointer hover:shadow-[0_8px_30px_rgba(21,216,255,0.08)] hover:border-primary/30 transition-all"
 >
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
 <div>
 <div className="flex flex-wrap items-center gap-3 mb-1">
 <span
 className="text-base font-space font-bold text-text-primary font-mono tracking-tight"
 title={order.order_id}
 >
 {shortOrderId(order.order_id)}
 </span>
 <StatusBadge status={order.delivery_status || 'PENDING'} />
 </div>
 <p className="text-sm text-text-secondary">
 {safeFormatDate(order.created_at)}
 </p>
 </div>
 <div className="sm:text-right">
 <p className="text-2xl font-playfair font-bold text-text-primary">
 {formatCurrency(order.total_amount)}
 </p>
 <p className="text-sm text-text-secondary">{order.items.length} item(s)</p>
 </div>
 </div>

 <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-dashed border-border-subtle">
 <div className="flex items-center gap-2 text-sm text-text-secondary">
 <Package className="h-4 w-4" />
 <span>Payment: <StatusBadge status={order.payment_status} /></span>
 </div>
 
 {order.order_status === 'PENDING'&& (
 <button
 onClick={(e) => handleCancel(order.order_id, e)}
 disabled={cancelOrderMutation.isPending}
 className="px-4 py-2 text-sm font-space font-medium text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
 >
 Cancel Order
 </button>
 )}
 </div>
 </div>
 </motion.div>
 ))}
 </div>

 {/* Order Details Modal */}
 <AnimatePresence>
 {selectedOrder && (
 <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }}
 onClick={() => setSelectedOrder(null)}
 className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
 />
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-2xl bg-bg-card rounded-[32px] border border-border-subtle shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[90vh]"
 >
 <div className="px-8 py-6 border-b border-border-subtle flex items-center justify-between sticky top-0 bg-bg-card backdrop-blur-md z-10">
 <div>
 <h2 className="text-2xl font-playfair font-bold text-text-primary">Order Details</h2>
 {/* Full ID shown in drawer */}
 <p className="text-xs text-text-secondary font-mono break-all pr-4 mt-1">{selectedOrder.order_id}</p>
 </div>
 <button 
 onClick={() => setSelectedOrder(null)}
 className="p-2 text-text-secondary hover:text-text-primary rounded-full hover:bg-bg-secondary transition-colors"
 >
 <X className="h-6 w-6" />
 </button>
 </div>
 
 <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
 <div>
 <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Delivery</p>
 <StatusBadge status={selectedOrder.delivery_status || 'PENDING'} />
 </div>
 <div>
 <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Payment</p>
 <StatusBadge status={selectedOrder.payment_status} />
 </div>
 <div>
 <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Method</p>
 <p className="font-semibold text-text-primary">{selectedOrder.payment_method}</p>
 </div>
 <div>
 <p className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-2">Date</p>
 <p className="font-semibold text-text-primary">
 {safeFormatDate(selectedOrder.created_at, { year: 'numeric', month: 'numeric', day: 'numeric'})}
 </p>
 </div>
 </div>

 <div className="border-t border-dashed border-border-subtle pt-8">
 <h3 className="text-xl font-playfair font-bold text-text-primary mb-6">Items</h3>
 <div className="space-y-4">
 {selectedOrder.items.map((item, idx) => (
 <div key={idx} className="flex justify-between items-center gap-4">
 <div className="flex-1 min-w-0">
 <p className="font-medium text-text-primary truncate">{item.product_name}</p>
 <p className="text-sm text-text-secondary">
 Qty: {item.quantity} &times; {formatCurrency(item.price ?? 0)}
 </p>
 </div>
 <div className="text-right">
 <p className="font-playfair font-bold text-text-primary">
 {formatCurrency(item.subtotal ?? ((item.price ?? 0) * item.quantity))}
 </p>
 </div>
 </div>
 ))}
 </div>
 <div className="mt-6 pt-4 border-t border-border-subtle flex justify-between">
 <span className="font-semibold text-text-primary">Total</span>
 <span className="text-xl font-bold text-text-primary">{formatCurrency(selectedOrder.total_amount)}</span>
 </div>
 <div className="mt-6 flex justify-end">
 <button
 onClick={() => generateInvoice(selectedOrder)}
 className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-all shadow-soft"
 >
 <Download className="h-5 w-5" />
 Download Invoice
 </button>
 </div>
 </div>

 <div className="border-t border-dashed border-border-subtle pt-8">
 <h3 className="text-xl font-playfair font-bold text-text-primary mb-6">Payment Details</h3>
 {isLoadingPayments ? (
 <div className="space-y-3">
 <Skeleton className="h-10 w-full !bg-bg-secondary" />
 <Skeleton className="h-10 w-full !bg-bg-secondary" />
 </div>
 ) : latestPayment ? (
 <div className="bg-bg-secondary/50 p-6 rounded-2xl border border-border-subtle space-y-4 text-sm">
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-border-subtle pb-3">
 <span className="text-text-secondary font-medium">Payment ID</span>
 <span title={latestPayment.payment_id} className="font-space font-medium text-text-primary sm:col-span-2 truncate min-w-0">{latestPayment.payment_id}</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 border-b border-border-subtle pb-3">
 <span className="text-text-secondary font-medium">Amount</span>
 <span className="font-space font-medium text-text-primary sm:col-span-2">{formatCurrency(latestPayment.amount)}</span>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-center">
 <span className="text-text-secondary font-medium">Status</span>
 <div className="sm:col-span-2"><StatusBadge status={latestPayment.payment_status} /></div>
 </div>
 {selectedOrder.payment_status === 'EXPIRED'? (
 <div className="pt-4 flex justify-end">
 <button 
 disabled
 className="px-6 py-3 bg-gray-500/20 text-text-secondary rounded-full font-space font-bold cursor-not-allowed text-sm border border-gray-500/30"
 >
 Payment Expired
 </button>
 </div>
 ) : latestPayment.payment_status === 'FAILED'? (
 <div className="pt-4 flex justify-end">
 <button 
 onClick={handleContinuePayment}
 disabled={createPaymentMutation.isPending}
 className="px-6 py-3 bg-primary text-bg-primary rounded-full font-space font-bold hover:shadow-[0_0_20px_rgba(21,216,255,0.4)] transition-all text-sm disabled:opacity-50"
 >
 {createPaymentMutation.isPending ? 'Loading...': 'Continue Payment'}
 </button>
 </div>
 ) : null}
 </div>
 ) : (
 <div className="text-center p-8 bg-bg-secondary/50 rounded-2xl border border-border-subtle">
 <p className="text-text-secondary mb-4">No payment records found.</p>
 {selectedOrder.payment_status === 'EXPIRED'? (
 <button 
 disabled
 className="inline-block px-8 py-3 bg-gray-500/20 text-text-secondary rounded-full font-space font-bold cursor-not-allowed text-sm mt-4 border border-gray-500/30"
 >
 Payment Expired
 </button>
 ) : selectedOrder.order_status === 'PENDING'? (
 <button 
 onClick={handleContinuePayment}
 disabled={createPaymentMutation.isPending}
 className="inline-block px-8 py-3 bg-primary text-bg-primary rounded-full font-space font-bold hover:shadow-[0_0_20px_rgba(21,216,255,0.4)] transition-all text-sm mt-4 disabled:opacity-50"
 >
 {createPaymentMutation.isPending ? 'Loading...': 'Continue Payment'}
 </button>
 ) : null}
 </div>
 )}
 </div>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>

 </motion.div>
 );
}
