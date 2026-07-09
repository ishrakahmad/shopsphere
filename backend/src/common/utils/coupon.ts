// MVP coupon system — hardcoded codes.
// TODO: move to a `coupons` DB table when you need dynamic, admin-managed coupons.

interface Coupon {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal?: number;
}

const COUPONS: Coupon[] = [
  { code: 'SAVE10', type: 'PERCENT', value: 10, minSubtotal: 20 },
  { code: 'SAVE20', type: 'PERCENT', value: 20, minSubtotal: 100 },
  { code: 'FLAT5', type: 'FIXED', value: 5, minSubtotal: 15 },
];

export function validateCoupon(code: string, subtotal: number): { valid: boolean; discount: number; message?: string } {
  const coupon = COUPONS.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());
  if (!coupon) return { valid: false, discount: 0, message: 'Invalid coupon code' };
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return { valid: false, discount: 0, message: `Minimum order of $${coupon.minSubtotal} required for this coupon` };
  }
  const discount = coupon.type === 'PERCENT' ? (subtotal * coupon.value) / 100 : coupon.value;
  return { valid: true, discount: Math.min(discount, subtotal) };
}
