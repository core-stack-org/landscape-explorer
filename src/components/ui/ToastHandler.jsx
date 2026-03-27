import { Toaster } from "react-hot-toast";

const toastOptions = {
  duration: 3200,
  style: {
    borderRadius: "14px",
    background: "#111827",
    color: "#ffffff",
    padding: "12px 14px",
    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  },
  success: {
    iconTheme: {
      primary: "#22c55e",
      secondary: "#ffffff",
    },
  },
  error: {
    iconTheme: {
      primary: "#ef4444",
      secondary: "#ffffff",
    },
  },
};

const ToastHandler = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={toastOptions}
      containerStyle={{
        top: 20,
        right: 20,
      }}
      gutter={10}
    />
  );
};

export default ToastHandler;
