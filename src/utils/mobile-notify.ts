import { message } from "antd";

// Mobile notification: sleek dynamic capsule notification (island style)
// designed specifically for mobile screens — never occupies the whole screen,
// compact width, pill-shaped, crisp typography, and non-blocking.

export const MOBILE_TOAST_DURATION = 2.2;
export const MOBILE_TOAST_BOTTOM_OFFSET = 84;
export const MOBILE_TOAST_CLASS = "mobile-toast mobile-capsule-notice";

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
    style: {
      fontSize: 12,
    },
  });
}

export const notifyMobile = {
  success: (content: ToastContent) => open("success", content),
  error: (content: ToastContent) => open("error", content),
  warning: (content: ToastContent) => open("warning", content),
  info: (content: ToastContent) => open("info", content),
};
