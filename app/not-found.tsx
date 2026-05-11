import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <h2 className="mb-2 text-2xl font-bold text-slate-800">Página Não Encontrada</h2>
      <p className="mb-8 text-slate-600">Não conseguimos encontrar a página que você está procurando.</p>
      <Link
        href="/"
        className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
