import React from "react";
import { Lightbulb } from "lucide-react";

export default function TopSection({ configTextFn, data }) {
  return (
    <p className="text-center flex items-center justify-center gap-2 border-[10px] border-[#11000080] text-lg md:text-xl font-medium p-4 bg-gray-50 rounded-lg">
      <Lightbulb size={50} color="black" />
      {configTextFn(data)}
    </p>
  );
}
