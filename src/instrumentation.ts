export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ db, pool }, { startGenerationWorker }] = await Promise.all([
    import("./server/db/client"),
    import("./server/generations/worker"),
  ]);
  startGenerationWorker(db, pool);
}
