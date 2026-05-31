"use client";

export default function PlaceholderImage({ name }: { name: string }) {
  return (
    <img
      src="/images/placeholder.png"
      alt={name}
      className="w-full h-full object-cover"
    />
  );
}