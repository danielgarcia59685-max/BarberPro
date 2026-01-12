// components/Navbar.tsx
import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="border-b bg-white">
      <nav className="mx-auto max-w-5xl h-14 px-4 flex items-center justify-between">
        <Link href="/" className="font-semibold">Barbearia</Link>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-md bg-black text-white hover:bg-gray-800"
          >
            Agendar
          </Link>
        </div>
      </nav>
    </header>
  )
}
