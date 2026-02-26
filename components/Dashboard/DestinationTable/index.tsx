"use client";

import { FaTrashAlt } from "react-icons/fa";

export default function DestinationTable({ destinations, onDelete }: { destinations: any[], onDelete: (id: string) => void }) {
  return (
    <table className="min-w-full text-left table-auto">
      <thead className="bg-gray-100">
        <tr>
          <th className="p-4">Title</th>
          <th className="p-4">Description</th>
          <th className="p-4">Price</th>
          <th className="p-4">Category</th>
          <th className="p-4">Actions</th>
        </tr>
      </thead>
      <tbody>
        {destinations.map((destination) => (
          <tr key={destination.id} className="border-t hover:bg-gray-50">
            <td className="p-4">{destination.title}</td>
            <td className="p-4">{destination.description}</td>
            <td className="p-4">{destination.price}</td>
            <td className="p-4">{destination.category.name}</td>
            <td className="p-4">
              <button onClick={() => onDelete(destination.id)} className="bg-red-600 text-white p-2 rounded hover:bg-red-700">
                <FaTrashAlt />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
