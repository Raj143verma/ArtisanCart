import { PaymentProviderInterface } from './paymentProvider.interface.js';

export class MockProvider extends PaymentProviderInterface {
  async createIntent(transactionId, amount, currency) {
    const providerSessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const clientToken = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    return { providerSessionId, clientToken };
  }

  async executeRefund(providerSessionId, amount) {
    const refundId = `mock_ref_${Date.now()}_${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    return { refundId, status: 'succeeded' };
  }
}
