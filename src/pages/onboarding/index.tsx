export default function ShopSetup() {
  console.log("ShopSetup component rendering");
  
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f2f5",
      padding: "20px"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "8px",
        maxWidth: "600px",
        width: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ marginBottom: "8px", fontSize: "24px" }}>Welcome to Shringar POS!</h1>
        <p style={{ color: "#666", marginBottom: "24px" }}>
          Onboarding features will be available soon.
        </p>
        <p style={{ color: "#999", fontSize: "14px" }}>
          This is the shop setup page. The actual form will be added here.
        </p>
      </div>
    </div>
  );
}