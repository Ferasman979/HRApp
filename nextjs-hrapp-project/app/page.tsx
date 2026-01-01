import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

export default async function Home() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-4xl font-bold mb-4">Welcome to the HR App</h1>
      <p className="text-xl mb-8">You are logged in as {session.user?.email}</p>

      <div className="grid gap-4">
        <a
          href="/jobs"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:-translate-y-1"
        >
          Go to Recruitment Dashboard
        </a>
      </div>
    </div>
  );
}
