'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  console.error(error)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <button
        onClick={() => reset()}
        className="rounded bg-white px-4 py-2 text-black"
      >
        Try again
      </button>
    </div>
  )
}
