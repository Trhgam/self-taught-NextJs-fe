import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1 className="text-6xl font-bold tracking-tight text-center text-gray-900 dark:text-white sm:text-left">
          Welcome to Next.js!
        </h1>
        <div className="flex flex-col flex-1 items-center w-full justify-center mt-6 sm:mt-0">
          <Image
            src="/brand/coffee-logo.png"
            alt="Company Logo"
            width={150}
            height={50}
            priority // Ưu tiên load trước vì nó nằm ở đầu trang
          />
        </div>
      </main>
    </div>
  );
}
