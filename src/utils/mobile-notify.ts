import { message } from "antd";

// Mobile toast variant: small + bottom-docked above the tab bar with a shorter
// duration. Use at mobile call sites only — desktop surfaces keep using antd's
// `message` directly (unchanged top-docked, default-duration behavior).

// Shorter than antd's default 3s duration.
export const MOBILE_TOAST_DURATION = 2;
// Applied to the notice; the `.mobile-toast` rule in index.css bottom-docks it.
export const MOBILE_TOAST_CLASS = "mobile-toast";
// Clears the bottom tab bar (~70px incl. safe-area padding).
export const MOBILE_TOAST_BOTTOM_OFFSET = 84;

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
      maxWidth: 320,
      marginBottom: MOBILE_TOAST_BOTTOM_OFFSET,
    },
  });
}

export const notifyMobile = {
  success: (content: ToastContent) => open("success", content),
  error: (content: ToastContent) => open("error", content),
  warning: (content: ToastContent) => open("warning", content),
  info: (content: ToastContent) => open("info", content),
};
