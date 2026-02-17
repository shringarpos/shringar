import { Authenticated, ErrorComponent, Refine, WelcomePage } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { GoogleOutlined } from "@ant-design/icons"
import { AuthPage, ThemedLayout, useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { liveProvider } from "@refinedev/supabase";
import { App as AntdApp } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { ColorModeContextProvider } from "./contexts/color-mode";
import authProvider from "./providers/auth";
import { dataProvider } from "./providers/data";
import { supabaseClient } from "./providers/supabase-client";

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                liveProvider={liveProvider(supabaseClient)}
                authProvider={authProvider}
                routerProvider={routerProvider}
                notificationProvider={useNotificationProvider}
                resources={[
                  {
                    name: "ornaments",
                    list: "/ornaments",
                  }
                ]}
                options={{
                  liveMode: "off",
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key={"authenticated-routes"}
                        fallback={<CatchAllNavigate to="/login"/>}
                      >
                        <ThemedLayout>
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route
                      index
                      element={<NavigateToResource resource="ornaments" />}
                    />

                    <Route path="/ornaments">
                      <Route index element={ <> hii this is ornaments index pages </>}/>
                    </Route>
                  </Route>

                  <Route
                    element={
                      <Authenticated key={"auth-pages"} fallback={<Outlet />}>
                        <NavigateToResource resource="ornaments"/>
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
                          formProps={{
                            initialValues: {
                              email: "info@shringarpos.com",
                              password: "shringar-pos",
                            },
                          }}
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
