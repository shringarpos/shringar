import { useGetIdentity, useList } from "@refinedev/core";

interface Shop {
    id: string;
    user_id: string;
    name: string;
}

export function useShopCheck() {
    const { data: identity, isLoading: isIdentityLoading } = useGetIdentity<{
        id: string;
    }>();

    const { data: shops, isLoading: isShopsLoading } = useList<Shop>({
        resource: "shops",
        filters: [
            {
                field: "user_id",
                operator: "eq",
                value: identity?.id,
            },
        ],
        queryOptions: {
            enabled: !!identity?.id,
            retry: 1, // Only retry once to avoid hanging
            staleTime: 5 * 60 * 1000, // Cache for 5 minutes
            throwOnError: false,
        },
    });

    return {
        hasShop: (shops?.data?.length ?? 0) > 0,
        isLoading: isIdentityLoading || isShopsLoading,
        shops: shops?.data,
        isError,
    };
}