"use client";

import { getImagePath } from "@/lib/menu-data";

export default function PlaceholderImage({ name }: { name: string }) {
  return (
    <img
      src={getImagePath("placeholder.png")}
      alt={name}
      className="w-full h-full object-cover"
    />
  );
}
