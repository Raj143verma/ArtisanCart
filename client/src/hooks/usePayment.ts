import { useCallback, useState } from 'react';
import { initializePayment, verifyPayment } from '../services/paymentService';
import type { Transaction } from '../types/checkout';
import { getApiErrorMessage } from '../services/apiError';

export function usePayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const processPayment = useCallback(
    async (
      orderIds: string[],
      simulateFailure = false,
    ): Promise<{ success: boolean; transaction: Transaction | null }> => {
      setIsProcessing(true);
      setPaymentError(null);

      const idempotencyKey = `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      try {
        // 1. Initialize payment session with provider
        const initTx = await initializePayment(orderIds, idempotencyKey, 'mock');

        if (!initTx.providerSessionId) {
          throw new Error('Provider session was not generated.');
        }

        // 2. Capture / verify payment
        const targetStatus = simulateFailure ? 'failed' : 'captured';
        const finalTx = await verifyPayment(initTx.providerSessionId, targetStatus);
        setTransaction(finalTx);

        if (finalTx.paymentStatus === 'captured') {
          return { success: true, transaction: finalTx };
        } else {
          setPaymentError('Payment was declined or failed.');
          return { success: false, transaction: finalTx };
        }
      } catch (err) {
        const message = getApiErrorMessage(err, 'Payment processing failed.');
        setPaymentError(message);
        return { success: false, transaction: null };
      } finally {
        setIsProcessing(false);
      }
    },
    [],
  );

  return {
    isProcessing,
    paymentError,
    transaction,
    processPayment,
  };
}
