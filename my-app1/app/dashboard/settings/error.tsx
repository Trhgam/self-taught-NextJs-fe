"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div>
      <h2>Đã có lỗi xảy ra tại trang login!</h2>
      <button onClick={() => reset()}>Thử lại</button>
    </div>
  );
}
