export class PaymentProviderInterface {
  /**
   * Initializes a payment session/intent with the gateway.
   * @param {string} transactionId - Unique database transaction ID.
   * @param {number} amount - Total transaction cost.
   * @param {string} currency - Transaction currency (e.g. 'USD').
   * @returns {Promise<{ providerSessionId: string, clientToken: string }>}
   */
  async createIntent(transactionId, amount, currency) {
    throw new Error('Method "createIntent" must be implemented by payment provider subclasses.');
  }

  /**
   * Refines or mocks refund execution.
   * @param {string} providerSessionId - Gateway session reference.
   * @param {number} amount - Refund amount.
   * @returns {Promise<{ refundId: string, status: string }>}
   */
  async executeRefund(providerSessionId, amount) {
    throw new Error('Method "executeRefund" must be implemented by payment provider subclasses.');
  }
}
