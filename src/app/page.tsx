export default function Home() {
  const count: number = "esto rompe el tipo deliberadamente (T16)";
  return (
    <main>
      <h1>WMS Construcción</h1>
      <p>Fase 01: Repositorio y controles de ingeniería. {count}</p>
    </main>
  );
}
