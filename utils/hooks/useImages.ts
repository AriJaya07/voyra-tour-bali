"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { imageService, UploadImagePayload } from "../service/image.service";

export function useImages(filters?: { destinationId?: number; packageId?: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["images", filters];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["images"] });

  const { data = [], isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => imageService.getAll(filters),
  });

  const uploadMutation = useMutation({
    mutationFn: imageService.upload,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { destinationId?: number | null; packageId?: number | null } }) =>
      imageService.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: imageService.delete,
    onSuccess: invalidate,
  });

  return {
    data,
    isLoading,
    isError,
    uploadImage: uploadMutation.mutate,
    uploadImageAsync: uploadMutation.mutateAsync,
    updateImage: updateMutation.mutate,
    deleteImage: deleteMutation.mutate,
    uploading: uploadMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}