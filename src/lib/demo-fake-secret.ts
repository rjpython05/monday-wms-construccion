// Demostración deliberada del gate de secretos (T16, SEC-001). El
// valor de AWS de ejemplo oficial (AKIAIOSFODNN7EXAMPLE) resultó estar
// en el allowlist por defecto de gitleaks (es el placeholder que AWS
// usa en su propia documentación, precisamente para evitar falsos
// positivos), así que no disparaba la regla. Este bloque PEM es
// contenido inventado (no una clave real de nada) que sí dispara la
// regla genérica "private-key" de gitleaks por su formato, no por su
// contenido. Este archivo nunca se mergea a main.
export const DEMO_FAKE_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu
KUpRKfFLfRYC9AIKjbJTWit+CqvjWYzvQwECAwEAAQJAIJLixBy2qpFoS4DSmoEm
o3qGy0t6z09AIJtH+5OeRV1be+N4cDYJKffGzDaajA2aRkuxWiKbfaPKxdeORNxP
AQIhAKEjlQi4aZ8hsRfKQPLN+UTZNhcKwVQGaD0ZwVHnaZWRAiEA1b8nPt8JAYRq
d0A4oT5HYcS3CW3wRPFeGi9GpdcV4QECIQCQS5jN3HgRn0rUmuYvqwFnl2w2dIpy
dummyexampleonlynotarealkey==
-----END RSA PRIVATE KEY-----`;
