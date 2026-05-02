// src/lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const QueryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      // Dữ liệu sẽ được coi là "cũ" sau 5 phút
      staleTime: 1000 * 60 * 5,
      // Không tự động refetch khi quay lại cửa sổ trình duyệt
      refetchOnWindowFocus: false,
      // Thử lại 1 lần nếu API lỗi
      retry: 1,
    },
  },
});