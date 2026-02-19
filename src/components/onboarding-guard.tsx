import { Spin } from "antd";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useShopCheck } from "../hooks/use-shop-check";

interface OnboardingGuardProps {
    children: React.ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Only check shop if NOT on onboarding route
    const isOnboardingRoute = location.pathname.startsWith("/onboarding");
    const { hasShop, isLoading } = useShopCheck();

    useEffect(() => {
        // Skip all checks if on onboarding route
        if (isOnboardingRoute) {
            return;
        }

        // Don't redirect while loading
        if (isLoading) {
            return;
        }

        // If no shop exists, redirect to onboarding
        if (!hasShop) {
            navigate("/onboarding/shop-setup", { replace: true });
        }
    }, [hasShop, isLoading, navigate, isOnboardingRoute]);

    // If on onboarding route, just render children (no guards)
    if (isOnboardingRoute) {
        return <>{children}</>;
    }

    // Loading state for main routes
    if (isLoading) {
        return (
            <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                minHeight: "100vh" 
            }}>
                <Spin size="large" tip="Loading your workspace..." />
            </div>
        );
    }

    // Has shop, render children with layout
    if (hasShop) {
        return <>{children}</>;
    }

    // No shop and not loading - redirecting
    return (
        <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            minHeight: "100vh" 
        }}>
            <Spin size="large" tip="Redirecting to setup..." />
        </div>
    );
}