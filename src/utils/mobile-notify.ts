import { message } from "antd";

// Mobile notification: sleek top-floating capsule notification (island style)
// positioned at the top of the mobile viewport, safely away from bottom docks,
// tab bars, and action drawers.

export const MOBILE_TOAST_DURATION = 2.2;
export const MOBILE_TOAST_CLASS = "mobile-capsule-notice";

type ToastContent = string;

function open(
  type: "success" | "error" | "warning" | "info",
  content: ToastContent
) {
  return message.open({
    type,
    content,
    duration: MOBILE_TOAST_DURATION,
    className: MOBILE_TOAST_CLASS,
  });
}

export const notifyMobile = {
  success: (content: ToastContent) => open("success", content),
  error: (content: ToastContent) => open("error", content),
  warning: (content: ToastContent) => open("warning", content),
  info: (content: ToastContent) => open("info", content),
};
