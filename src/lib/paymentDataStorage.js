// Temporary storage for payment data (in production, use Redis or database)
let paymentData = null;
let failureData = null;

// Function to set payment data (called from route handlers)
export function setPaymentData(data) {
  paymentData = data;
  failureData = null; // Clear failure data
}

export function setFailureData(data) {
  failureData = data;
  paymentData = null; // Clear payment data
}

export function getPaymentData() {
  return paymentData || failureData;
}

export function clearPaymentData() {
  paymentData = null;
  failureData = null;
}
