import Link from "next/link";
import dbConnect from "@/lib/db";
import Job from "@/models/Job";

// Force dynamic rendering so new jobs show up instantly
export const dynamic = "force-dynamic";

async function getJobs() {
  await dbConnect();
  // Sort by newest first
  const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
  return JSON.parse(JSON.stringify(jobs));
}

export default async function Home() {
  const jobs = await getJobs();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
            EasyApply Careers
          </h1>
          <p className="text-slate-500">Find your next role with us today.</p>
        </header>

        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No open positions at the moment. Check back soon!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-2">Date Posted</div>
                <div className="col-span-6">Position</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-2 text-right">Action</div>
              </div>

              {/* Job Rows */}
              {jobs.map((job: any) => (
                <div
                  key={job._id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 p-6 items-center hover:bg-slate-50 transition duration-150 group"
                >
                  <div className="col-span-2 text-sm text-slate-400">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  <div className="col-span-6">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-blue-600 transition">
                      {job.title}
                    </h3>
                  </div>
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {job.location || "Remote"}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <Link
                      href={`/job/${job._id}`}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
