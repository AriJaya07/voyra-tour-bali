"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { FaHome, FaList, FaTag } from "react-icons/fa";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-800 text-white p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <ul>
        <li>
          <Link href="/dashboard" className={`flex items-center p-3 ${pathname === '/dashboard' ? 'bg-blue-600' : ''}`}>
            <FaHome className="mr-2" /> Home
          </Link>
        </li>
        <li>
          <Link href="/dashboard/destinations" className={`flex items-center p-3 ${pathname.includes('destinations') ? 'bg-blue-600' : ''}`}>
            <FaList className="mr-2" /> Destinations
          </Link>
        </li>
        <li>
          <Link href="/dashboard/categories" className={`flex items-center p-3 ${pathname.includes('categories') ? 'bg-blue-600' : ''}`}>
            <FaTag className="mr-2" /> Categories
          </Link>
        </li>
      </ul>
    </div>
  );
}
