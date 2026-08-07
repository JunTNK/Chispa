'use client';

/**
 * LocalLLM — Modelo de lenguaje local ejecutándose en el navegador
 * via Transformers.js (HuggingFace) cargado desde CDN.
 * Usa Qwen2.5-1.5B-Instruct cuantizado.
 *
 * Singleton: una única instancia global que persiste mientras la página esté viva.
 * El modelo se cachea automáticamente en IndexedDB tras la primera descarga.
 * La librería Transformers.js se carga desde CDN para evitar problemas de bundling con Next.js/webpack.
 */

type PipelineFn = (text: string, opts?: Record<string, unknown>) => Promise<{ generated_text: string }[]>;

type LoadStatus = 'idle' | 'downloading' | 'loading' | 'ready' | 'error';

interface LoadProgress {
  status: 'download' | 'load' | 'done' | 'error' | 'idle';
  file?: string;
  progress: number; // 0–1
  total_files?: number;
  loaded_files?: number;
}

type ProgressCallback = (p: LoadProgress) => void;

// Use the browser-optimized build to avoid Node.js dependency resolution issues
const CDN_URL =
  'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0/dist/transformers.web.min.js';

/* ─── ChatML template for Qwen2.5 ─── */

function buildPrompt(system: string, messages: { role: 'user' | 'assistant'; content: string }[]): string {
  let prompt = `<|im_start|>system\n${system}<|im_end|>\n`;
  for (const m of messages) {
    prompt += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`;
  }
  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

/* ─── Singleton ─── */

export class LocalLLM {
  private static INSTANCE: LocalLLM | null = null;

  private _pipeline: PipelineFn | null = null;
  private _status: LoadStatus = 'idle';
  private _error: string | null = null;
  private _progress: LoadProgress = { status: 'idle', progress: 0 };
  private _progressCbs: Set<ProgressCallback> = new Set();
  private _modelId: string;
  private _loadPromise: Promise<void> | null = null;

  private constructor(modelId: string) {
    this._modelId = modelId;
  }

  /** Obtiene (o crea) la instancia única */
  static getInstance(modelId = 'onnx-community/Qwen2.5-1.5B-Instruct-q4'): LocalLLM {
    if (!LocalLLM.INSTANCE) {
      LocalLLM.INSTANCE = new LocalLLM(modelId);
    }
    return LocalLLM.INSTANCE;
  }

  /* ─── Getters ─── */

  get status(): LoadStatus {
    return this._status;
  }

  get error(): string | null {
    return this._error;
  }

  get progress(): LoadProgress {
    return this._progress;
  }

  get isLoaded(): boolean {
    return this._status === 'ready' && this._pipeline !== null;
  }

  get modelId(): string {
    return this._modelId;
  }

  /* ─── Progress subscription ─── */

  onProgress(cb: ProgressCallback): () => void {
    this._progressCbs.add(cb);
    // Emit current state immediately
    cb(this._progress);
    return () => {
      this._progressCbs.delete(cb);
    };
  }

  private _emitProgress(p: LoadProgress) {
    this._progress = p;
    for (const cb of this._progressCbs) {
      try {
        cb(p);
      } catch {
        // ignore callback errors
      }
    }
  }

  /* ─── Load ─── */

  async load(): Promise<void> {
    if (this._status === 'ready') return;
    if (this._loadPromise) return this._loadPromise;

    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  private async _doLoad(): Promise<void> {
    this._status = 'downloading';
    this._error = null;
    this._emitProgress({ status: 'download', progress: 0 });

    // Pipeline function — declared here so both try and catch blocks can use it
    let pipelineFn: any = null;

    try {
      // Cargar la librería Transformers.js desde CDN.
      // Usamos `new Function` para bypassear completamente el bundler (Next.js/Turbopack/webpack)
      // e importar directamente desde la URL en el browser.
      const mod: any = await new Function(`return import("${CDN_URL}")`)();
      const { pipeline: pipelineBuilder, env } = mod;
      pipelineFn = pipelineBuilder;

      if (env) {
        env.allowLocalModels = true;
        const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
        const preferredDevice = hasWebGPU ? 'webgpu' : 'webgl';
        await this._initPipeline(pipelineBuilder, preferredDevice);
      }
    } catch (err: any) {
      // WebGPU failed — try WebGL fallback (module already cached by browser, no re-import needed)
      if (pipelineFn) {
        try {
          await this._initPipeline(pipelineFn, 'webgl');
        } catch (fallbackErr: any) {
          this._status = 'error';
          this._error = fallbackErr?.message ?? String(fallbackErr);
          this._loadPromise = null;
          this._emitProgress({ status: 'error', progress: 0 });
          throw fallbackErr;
        }
      } else {
        this._status = 'error';
        this._error = err?.message ?? String(err);
        this._loadPromise = null;
        this._emitProgress({ status: 'error', progress: 0 });
        throw err;
      }
    }
  }

  /** Initialize the ML pipeline for a specific device (webgpu | webgl) */
  private async _initPipeline(
    pipelineBuilder: any,
    device: string
  ): Promise<void> {
    this._emitProgress({ status: 'load', progress: 0 });

    const pipe = await pipelineBuilder('text-generation', this._modelId, {
      dtype: 'q4',
      device: device as any,
      progress_callback: (p: any) => {
        if (p.status === 'progress') {
          this._emitProgress({
            status: 'download',
            file: p.file,
            progress: p.progress ?? 0,
            total_files: p.total_files,
            loaded_files: p.loaded_files,
          });
        }
      },
    });

    this._pipeline = pipe as unknown as PipelineFn;
    this._status = 'ready';
    this._emitProgress({ status: 'done', progress: 1 });
  }

  /* ─── Chat ─── */

  /**
   * Conversación con el modelo local.
   *
   * - Recibe el historial completo (mensajes previos + el nuevo) para dar
   *   contexto conversacional real (seguimiento de preguntas, referencias).
   * - `max_new_tokens` se escala con la longitud del prompt: respuestas largas
   *   solo cuando el historial lo justifica, ahorrando cómputo en el resto.
   * - Limpia la respuesta (quita marcadores ChatML residuales, espacios
   *   repetidos) y lanza error si el modelo no genera nada — el CoachAgent
   *   usa ese error para caer a su fallback rule-based.
   */
  async chat(
    messages: { role: 'user' | 'assistant'; content: string }[],
    system: string,
    opts?: { max_new_tokens?: number; temperature?: number; repetition_penalty?: number }
  ): Promise<string> {
    if (!this._pipeline) {
      throw new Error('Model not loaded. Call load() first.');
    }

    const prompt = buildPrompt(system, messages);
    // Escalar tokens con el historial: más contexto → respuesta algo más larga.
    const historyTokens = messages.slice(0, -1).reduce((n, m) => n + m.content.length, 0);
    const maxNew = opts?.max_new_tokens ?? (historyTokens > 400 ? 512 : 256);

    const result = await this._pipeline(prompt, {
      max_new_tokens: maxNew,
      temperature: opts?.temperature ?? 0.7,
      top_p: 0.9,
      top_k: 40,
      do_sample: true,
      repetition_penalty: opts?.repetition_penalty ?? 1.1,
    });

    const full = result[0]?.generated_text ?? '';
    // Extract only the assistant's response (after the final `|<im_start|>assistant\n`)
    const idx = full.lastIndexOf('<|im_start|>assistant\n');
    let raw = '';
    if (idx !== -1) {
      raw = full.slice(idx + '<|im_start|>assistant\n'.length);
    } else {
      // Fallback: return everything after the prompt
      raw = full.slice(prompt.length);
    }

    const cleaned = this._clean(raw);
    if (!cleaned) {
      throw new Error('Model returned empty response');
    }
    return cleaned;
  }

  /** Limpieza determinista de la respuesta del modelo. */
  private _clean(raw: string): string {
    return raw
      .replace(/<\|im_end\|>|<\|im_start\|>/g, '') // tokens ChatML residuales
      .replace(/\s+/g, ' ')                           // espacios/nuevas líneas repetidas
      .replace(/\s+([.,;:!?])/g, '$1')                // puntuación pegada
      .trim();
  }

  /* ─── Reset ─── */

  reset() {
    this._pipeline = null;
    this._status = 'idle';
    this._error = null;
    this._loadPromise = null;
    this._emitProgress({ status: 'idle', progress: 0 });
  }
}
