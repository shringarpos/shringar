import { Authenticated, Refine, type TitleProps } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { GoogleOutlined } from "@ant-design/icons";
import { AuthPage, ErrorComponent, ThemedLayout, ThemedSider, useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import "./index.css";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, Typography, notification, message } from "antd";

notification.config({
  placement: "topLeft",
  top: 12,
});
message.config({
  top: 12,
});
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from "react-router";
import { ColorModeContextProvider } from "./contexts/color-mode";
import authProvider from "./providers/auth";
import { dataProvider } from "./providers/data";
import { Coins, FileText, Gem, Images, LayoutGrid, List, ReceiptIcon, SettingsIcon, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import CustomerCreatePage from "./pages/customers/create";
import Ornaments from "./pages/inventory/ornaments";
import OrnamentCreatePage from "./pages/inventory/ornaments/create";
import OrnamentEditPage from "./pages/inventory/ornaments/edit";
import Settings from "./pages/settings";
import ShopSetup from "./pages/onboarding";
import { OnboardingGuard } from "./components/onboarding-guard";
import Categories from "./pages/inventory/categories";
import MetalRates from "./pages/metal-rates";
import { Header } from "./components";
import { MobileShell } from "./components/mobile/mobile-shell";
import CreateSale from "./pages/pos";
import Invoices from "./pages/invoices";
import InvoiceShow from "./pages/invoices/show";
import InvoiceEdit from "./pages/invoices/edit";
import GoldLedger from "./pages/gold-ledger";
import GoldLoanCreatePage from "./pages/gold-ledger/create";
import GoldLedgerReports from "./pages/gold-ledger/reports";
import DesignGallery from "./pages/design-gallery";
import AlbumShow from "./pages/design-gallery/album-show";
import RequestAccessPage from "./pages/auth/request-access";
import CreateAccountPage from "./pages/auth/create-account";
import ApproveAccessPage from "./pages/auth/approve-access";

const SidebarTitle: React.FC<TitleProps> = ({ collapsed }) => {
  return (
      <img
        src={collapsed ? "/logo_icon.png" : "/logo.png"}
        alt="Shringar"
        style={{
          width: collapsed ? "32px" : "120px",
          height: "auto",
          transition: "all 0.3s ease",
          display: "block",
          margin: "0 auto",
        }}
      />
  );
};

function App() {
  return (
    <BrowserRouter>
      {/* <GitHubBanner /> */}
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp notification={{ placement: "topLeft", top: 12 }} message={{ top: 12 }}>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                authProvider={authProvider}
                resources={[
                  {
                    name: "dashboard",
                    list: "/",
                    meta: {
                      label: "Dashboard",
                      icon: <LayoutGrid className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "sales",
                    list: "/sales/new",
                    meta: {
                      label: "New Sale",
                      icon: <ShoppingCart className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "customers",
                    list: "/customers",
                    meta: {
                      label: "Customers",
                      icon: <Users className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "gold_ledger",
                    list: "/gold-ledger",
                    meta: {
                      label: "Gold Ledger",
                      icon: <Coins className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "invoices",
                    list: "/invoices",
                    show: "/invoices/show/:id",
                    edit: "/invoices/edit/:id",
                    meta: {
                      label: "Invoices",
                      icon: <ReceiptIcon className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "ornaments",
                    list: "/ornaments",
                    meta: {
                      label: "Ornaments",
                      icon: <Gem className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "categories",
                    list: "/categories",
                    meta: {
                      label: "Categories",
                      icon: <List className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "metal_rates",
                    list: "/metal-rates",
                    meta: {
                      label: "Metal Rates",
                      icon: <TrendingUp className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "design_gallery",
                    list: "/design-gallery",
                    show: "/design-gallery/:id",
                    meta: {
                      label: "Design Gallery",
                      icon: <Images className="w-4 h-4" />,
                    },
                  },
                  {
                    name: "settings",
                    list: "/settings",
                    meta: {
                      label: "Settings",
                      icon: <SettingsIcon className="w-4 h-4" />,
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "wD1V28-b80cO4-Wl06kS",
                  title: {
                    icon: <SidebarTitle collapsed={false}/>,
                    text: "",
                  },
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />
                      }
                      >
                        <OnboardingGuard>
                          <MobileShell SidebarTitle={SidebarTitle}>
                            <Outlet />
                          </MobileShell>
                        </OnboardingGuard>
                      </Authenticated>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sales/new" element={<CreateSale />} />
                    <Route path="/invoices">
                      <Route index element={<Invoices />} />
                      <Route path="show/:id" element={<InvoiceShow />} />
                      <Route path="edit/:id" element={<InvoiceEdit />} />
                    </Route>
                    <Route path="/customers">
                      <Route index element={<Customers />} />
                      <Route path="new" element={<CustomerCreatePage />} />
                    </Route>
                    <Route path="/ornaments">
                      <Route index element={<Ornaments />} />
                      <Route path="new" element={<OrnamentCreatePage />} />
                      <Route path="edit/:id" element={<OrnamentEditPage />} />
                    </Route>
                    <Route path="/categories">
                      <Route index element={<Categories />} />
                    </Route>
                    <Route path="/metal-rates">
                      <Route index element={<MetalRates />} />
                    </Route>
                    <Route path="/gold-ledger">
                      <Route index element={<GoldLedger />} />
                      <Route path="new" element={<GoldLoanCreatePage />} />
                      <Route path="reports" element={<GoldLedgerReports />} />
                    </Route>
                    <Route path="/design-gallery">
                      <Route index element={<DesignGallery />} />
                      <Route path=":id" element={<AlbumShow />} />
                    </Route>
                    <Route path="/settings">
                      <Route index element={<Settings />} />
                    </Route>
                  </Route>

                  {/* Public Setup Route & Aliases */}
                  <Route
                    element={
                      <Authenticated
                        key="setup-route"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <Outlet />
                      </Authenticated>
                    }
                  >
                    <Route path="/setup" element={<ShopSetup />} />
                    <Route path="/onboarding/shop-setup" element={<ShopSetup />} />
                    <Route path="/onboarding" element={<ShopSetup />} />
                  </Route>

                  {/* Public Auth Routes */}
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-outer"
                        fallback={<Outlet />}
                      >
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route
                      path="/login"
                      element={
                        <AuthPage
                          type="login"
                          title="Shringar POS"
                          registerLink={
                            <div style={{ marginTop: 12, textAlign: "center" }}>
                              <Typography.Text style={{ fontSize: 13 }} type="secondary">
                                Don't have an account?{" "}
                                <Link to="/register" style={{ fontWeight: 600 }}>
                                  Request Access
                                </Link>
                              </Typography.Text>
                            </div>
                          }
                          providers={[
                            {
                              name: "google",
                              label: "Sign in with Google",
                              icon: (
                                <GoogleOutlined
                                  style={{
                                    fontSize: 18,
                                    lineHeight: 0,
                                  }}
                                />
                              ),
                            },
                          ]}
                        />
                      }
                    />
                    <Route path="/register" element={<RequestAccessPage />} />
                    <Route path="/request-access" element={<RequestAccessPage />} />
                    <Route path="/create-account" element={<CreateAccountPage />} />
                    <Route path="/activate" element={<CreateAccountPage />} />
                    <Route path="/accept-invite" element={<CreateAccountPage />} />
                    <Route path="/approve-access" element={<ApproveAccessPage />} />
                    <Route
                      path="/forgot-passoword"
                      element={<AuthPage title="Shringar POS" type="forgotPassword" />}
                    />
                    <Route
                      path="/update-password"
                      element={<AuthPage title="Shringar POS" type="updatePassword" />}
                    />
                  </Route>
                      
                {/* Catch All  */}
                  <Route
                    element={
                      <Authenticated key={"catch-all"}>
                        <ThemedLayout>
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
