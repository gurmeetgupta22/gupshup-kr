"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">😵</div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-red-400">
            Something went wrong!
          </h1>
          <p className="text-zinc-400">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button
          onClick={() => reset()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
        >
          Try again
        </Button>
      </div>
    </div>
  );
}
