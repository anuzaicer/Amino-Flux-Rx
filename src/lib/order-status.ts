export const STATUS_LABEL = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  in_review: "In provider review",
  approved: "Approved by provider",
  denied: "Not approved",
  fulfilled: "Shipped",
  cancelled: "Cancelled",
} as const;

export type OrderStatus = keyof typeof STATUS_LABEL;

export const STATUS_HELP: Record<OrderStatus, string> = {
  pending_payment:
    "Payment isn't confirmed yet. Our care team will share payment instructions if anything is still due.",
  paid: "Payment received. Your order is queued for fulfillment.",
  in_review: "A licensed provider is reviewing your intake, consents, and labs.",
  approved: "Your provider approved this plan. The pharmacy is preparing your order.",
  denied:
    "Your provider did not approve this plan. Check the note below or message your care team.",
  fulfilled: "Your order has shipped.",
  cancelled: "This order was cancelled.",
};
