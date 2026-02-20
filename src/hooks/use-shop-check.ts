import { useGetIdentity, useList } from "@refinedev/core";

interface Shop {
    id: string;
    user_id: string;
    name: string;
    code: string;
}

export function useShopCheck() {
    const { data: identity, isLoading: isIdentityLoading } = useGetIdentity<{
        id: string;
    }>();

    const { query: shopsQuery } = useList<Shop>({
        resource: "shops",
        filters: [
            {
                field: "user_id",
                operator: "eq",
                value: identity?.id,
            },
        ],
        pagination: {
            pageSize: 1, // We only need to know if at least one exists
        },
        queryOptions: {
            enabled: !!identity?.id,
            retry: 2,
            staleTime: 1000,
        },
    });

    const hasShop = (shopsQuery?.data?.data?.length ?? 0) > 0;
    const isLoading = isIdentityLoading || shopsQuery?.isLoading;

    return {
        hasShop,
        isLoading,
        shops: shopsQuery?.data?.data,
    };
}