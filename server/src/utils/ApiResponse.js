export class ApiResponse {
  constructor({ status = 'success', message = '', data = null, meta = null }) {
    this.status = status;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  toJSON() {
    return {
      status: this.status,
      message: this.message,
      data: this.data,
      meta: this.meta,
    };
  }
}
