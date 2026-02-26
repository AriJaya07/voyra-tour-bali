import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

export function useCategories() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await axios.get("/api/categories");
      return res.data;
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: any) => {
      const res = await axios.post("/api/categories", category);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  return {
    data,
    isLoading,
    createCategory,
  };
}
