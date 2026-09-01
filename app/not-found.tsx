export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 text-slate-800">
      <h2 className="text-2xl font-bold mb-2">Página não encontrada</h2>
      <p className="text-sm text-slate-500 mb-4">A página que você está procurando não existe.</p>
      <a
        href="/dashboard"
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
      >
        Voltar para o Dashboard
      </a>
    </div>
  );
}
