/**
 * pipeline-loader — carga el builder de pipelines de Transformers.js desde CDN.
 *
 * Aislado en su propio módulo para que los tests puedan mockear la carga
 * (la importación dinámica de una URL https no existe en jsdom).
 * Mismo patrón que src/lib/ai/local-llm.ts.
 */

const CDN_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.web.min.js';

export type PipelineBuilder = (
  task: string,
  model: string,
  opts?: Record<string, unknown>,
) => Promise<unknown>;

export async function loadPipelineBuilder(): Promise<PipelineBuilder> {
  const mod: any = await new Function(`return import("${CDN_URL}")`)();
  return mod.pipeline as PipelineBuilder;
}