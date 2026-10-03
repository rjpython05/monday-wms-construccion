// Fixture de Fase 1 para el gate de CI de SEC-005 — no es una página de
// producto. Solo renderiza contenido si AUDIT_SEC005_CANARY_VALUE está
// seteado, lo cual solo ocurre en el paso de CI dedicado a esta
// verificación (ver .github/workflows/ci.yml) — nunca en Vercel, donde
// esa variable no existe. Sirve para demostrar que el chequeo de CI
// detecta de verdad una fuga real de un valor no público hacia el HTML
// servido al cliente, en vez de ser una prueba tautológica (ver
// FND-01-09 en docs/evidence/phase-01/auditor-report-2.md).
export default function Sec005CanaryPage() {
  const value = process.env["AUDIT_SEC005_CANARY_VALUE"];
  if (!value) {
    return null;
  }
  return <div data-audit-canary={value} />;
}
