"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contentService, ContentPayload } from "../service/content.service";

export function useContents(destinationId?: number) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contents"] });

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["contents", destinationId],
    queryFn: () => contentService.getAll(destinationId),
  });

  const createMutation = useMutation({
    mutationFn: contentService.create,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ContentPayload> }) =>
      contentService.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: contentService.delete,
    onSuccess: invalidate,
  });

  return {
    data,
    isLoading,
    isError,
    createContent: createMutation.mutate,
    updateContent: updateMutation.mutate,
    deleteContent: deleteMutation.mutate,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}