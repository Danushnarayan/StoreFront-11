import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../api/paymentService';
import type { CreatePaymentPayload, ProcessPaymentPayload, Payment } from '../api/paymentService';
import { useAuth } from '../context/AuthContext';

export const usePaymentsByOrder = (orderId: string | undefined) => {
 const { isAuthenticated } = useAuth();
 return useQuery<Payment[], Error>({
 queryKey: ['payments', 'order', orderId],
 queryFn: () => paymentService.getOrderPayments(orderId!),
 enabled: isAuthenticated && !!orderId,
 });
};

export const usePayment = (paymentId: string | undefined) => {
 const { isAuthenticated } = useAuth();
 return useQuery<Payment, Error>({
 queryKey: ['payments', paymentId],
 queryFn: () => paymentService.getPayment(paymentId!),
 enabled: isAuthenticated && !!paymentId,
 });
};

export const useAdminPayments = () => {
 const { isAuthenticated } = useAuth();
 return useQuery<Payment[], Error>({
 queryKey: ['admin', 'payments'],
 queryFn: () => paymentService.getAllPayments(),
 enabled: isAuthenticated,
 });
};

export const useCreatePayment = () => {
 const queryClient = useQueryClient();
 
 return useMutation<Payment, Error, CreatePaymentPayload>({
 mutationFn: (payload) => paymentService.createPayment(payload),
 onSuccess: (data, variables) => {
 queryClient.setQueryData(['payments', 'order', variables.order_id], (oldData: Payment[] | undefined) => {
 if (!oldData) return [data];
 return [...oldData, data];
 });
 queryClient.setQueryData(['payments', data.payment_id], data);
 },
 });
};

export const useProcessPayment = () => {
 const queryClient = useQueryClient();
 
 return useMutation<Payment, Error, { paymentId: string; payload: ProcessPaymentPayload }>({
 mutationFn: ({ paymentId, payload }) => paymentService.processPayment(paymentId, payload),
 onSuccess: (data) => {
 queryClient.setQueryData(['payments', data.payment_id], data);
 queryClient.invalidateQueries({ queryKey: ['payments', 'order', data.order_id] });
 queryClient.invalidateQueries({ queryKey: ['orders'] });
 queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
 queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
 queryClient.invalidateQueries({ queryKey: ['cart'] });
 },
 });
};

export const useRefundPayment = () => {
 const queryClient = useQueryClient();
 
 return useMutation<Payment, Error, string>({
 mutationFn: (paymentId) => paymentService.refundPayment(paymentId),
 onSuccess: (data) => {
 queryClient.setQueryData(['payments', data.payment_id], data);
 queryClient.invalidateQueries({ queryKey: ['payments', 'order', data.order_id] });
 queryClient.invalidateQueries({ queryKey: ['orders'] });
 queryClient.invalidateQueries({ queryKey: ['admin', 'payments'] });
 queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
 },
 });
};
