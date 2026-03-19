import { Authenticated, Refine, type TitleProps } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { GoogleOutlined } from "@ant-design/icons"
import { AuthPage, ErrorComponent, ThemedLayout, ThemedSider, useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { ColorModeContextProvider } from "./contexts/color-mode";
import authProvider from "./providers/auth";
import { dataProvider } from "./providers/data";
import { Gem, LayoutGrid, List, ReceiptIcon, SettingsIcon, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import Dashboard from "./pages/dashboard";
import Customers from "./pages/customers";
import Ornaments from "./pages/inventory/ornaments";
import Settings from "./pages/settings";
import ShopSetup from "./pages/onboarding";
import { OnboardingGuard } from "./components/onboarding-guard";
import Categories from "./pages/inventory/categories";
import MetalRates from "./pages/metal-rates";
import { Header } from "./components";
import CreateSale from "./pages/pos";
import Invoices from "./pages/invoices";
import InvoiceShow from "./pages/invoices/show";
import InvoiceEdit from "./pages/invoices/edit";

const SidebarTitle: React.FC<TitleProps> = ({ collapsed }) => {
  return (
      <img
        src={collapsed ? "/logo_icon.png" : "/logo.png"}
        alt="Shringar"
        style={{
          width: collapsed ? 40 : 130,
          height: "auto",
          objectFit: "contain",
        }}
      />
  );
};

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "dashboard",
                    list: "/dashboard",
                    meta: {
                      label: "Dashboard",
                      icon: <Gem size={20}/>
                    },
                  },
                  {
                    name: "create-sale",
                    list: "/create-sale",
                    meta: {
                      label: "Create Sale",
                      icon: <ShoppingCart size={20} />
                    }
                  },
                  {
                    name: "invoices",
                    list: "/invoices",
                    show: "/invoices/:id",
                    edit: "/invoices/:id/edit",
                    meta: {
                      label: "Invoices",
                      icon: <ReceiptIcon size={20}/>
                    }
                  },
                  {
                    name: "inventory",
                    meta: {
                      icon: <LayoutGrid size={20}/>,
                      label: "Inventory"
                    }
                  },
                  {
                    name: "ornaments",
                    list: "/inventory/ornaments",
                    meta: {
                      label: "Ornaments",
                      icon: <Gem size={20} />,
                      parent: "inventory"
                    }
                  },
                  {
                    name: "ornament_categories",
                    list: "/inventory/categories",
                    meta: {
                      label: "Categories",
                      icon: <List size={20} />,
                      parent: "inventory"
                    }
                  },
                  {
                    name: "customers",
                    list: "/customers",
                    meta: {
                      label: "Customers",
                      icon: <Users size={20} />
                    }
                  },
                  {
                    name: "ornament_rates",
                    list: "/metal-rates",
                    meta: {
                      label: "Metal Rates",
                      icon: <TrendingUp size={20} />
                    }
                  },
                  {
                    name: "settings",
                    list: "/settings",
                    meta: {
                      label: "Settings",
                      icon: <SettingsIcon size={20} />
                    }
                  },
                  {
                    name: "shops",
                    meta: {
                      hide: true,
                      icon: <Store size={20} />
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                }}
              >
                <Routes>

                  {/* Onboarding Route */}
                  <Route
                    element={
                      <Authenticated
                        key={"onboarding"}
                        fallback={<CatchAllNavigate to="/login"/>}
                      >
                        <Outlet />
                      </Authenticated>
                    }
                  >
                    <Route path="/onboarding/shop-setup" element={<ShopSetup />} />
                  </Route>

                  {/* Main Routes */}
                  <Route
                    element={
                      <Authenticated
                        key={"authenticated-routes"}
                        fallback={<CatchAllNavigate to="/login"/>}
                      >
                        <OnboardingGuard>
                          <ThemedLayout
                            Sider={() => (
                              <ThemedSider
                                Title={SidebarTitle}
                                render={({ items }) => items}
                                siderItemsAreCollapsed={false}
                              />
                            )}
                            Header={() => {
                              return (
                                <Header />
                              );
                            }}
                          >
                            <Outlet />
                          </ThemedLayout>
                        </OnboardingGuard>
                      </Authenticated>
                    }
                  >
                    <Route
                      index
                      element={<NavigateToResource resource="dashboard" />}
                    />

                    <Route path="/dashboard">
                      <Route index element={<Dashboard />}/>
                    </Route>

                    <Route path="/create-sale" element={<CreateSale />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/invoices" element={<Invoices />} />
                    <Route path="/invoices/:id" element={<InvoiceShow />} />
                    <Route path="/invoices/:id/edit" element={<InvoiceEdit />} />
                    <Route path="/inventory/ornaments" element={<Ornaments />}/>
                    <Route path="/inventory/categories" element={<Categories />}/>
                    <Route path="/metal-rates" element={<MetalRates />}/>
                    <Route path="/settings" element={<Settings />} />
                  </Route>

                {/* Auth Routes  */}

                  <Route
                    element={
                      <Authenticated key={"auth-pages"} fallback={<Outlet />}>
                        <NavigateToResource resource="dashboard"/>
                      </Authenticated>
                    }
                  >
                    <Route
                      path="/login"
                      element={
                        <AuthPage
                          type="login"
                          title="Shringar POS"
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
                    <Route path="/register" element={<AuthPage title="Shringar POS" type="register" />}/>
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
                <DocumentTitleHandler
                  handler={({ autoGeneratedTitle }) =>
                    autoGeneratedTitle.replace(/\brefine\b/gi, "Shringar")
                  }
                />
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






