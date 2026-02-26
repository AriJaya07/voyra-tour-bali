"use client";

import { useState } from "react";

export default function DestinationForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    categoryId: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <h2 className="text-xl font-semibold">Create Destination</h2>
      <input
        type="text"
        placeholder="Destination Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="number"
        placeholder="Price"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <input
        type="number"
        placeholder="Category ID"
        value={formData.categoryId}
        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
        className="w-full p-2 border rounded"
      />
      <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Create Destination
      </button>
    </form>
  );
}
