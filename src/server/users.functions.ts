import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

const InputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Código é obrigatório")
    .max(50)
    .regex(/^[A-Za-z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline"),
  full_name: z.string().trim().min(1, "Nome é obrigatório").max(120),
});

export const createAthleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Verifica papel do caller
    const { data: roleRow, error: roleErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (roleErr) throw new Error("Falha ao validar permissão");
    if (roleRow?.role !== "moderador") {
      throw new Error("Apenas moderadores podem cadastrar atletas");
    }

    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 2. Insere em allowed_codes
    const { error: insErr } = await admin.from("allowed_codes").insert({
      code: data.code,
      full_name: data.full_name,
      role: "atleta",
      used: false,
    });
    if (insErr) {
      if (insErr.code === "23505" || /duplicate/i.test(insErr.message)) {
        throw new Error("Esse código já está cadastrado");
      }
      throw new Error("Falha ao registrar código: " + insErr.message);
    }

    // 3. Cria usuário no Auth
    const cleanCode = data.code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `${cleanCode}@bem-estar.app`;

    const { error: authErr } = await admin.auth.admin.createUser({
      email,
      password: data.code,
      email_confirm: true,
      user_metadata: { code: data.code },
    });

    if (authErr) {
      // rollback do allowed_codes
      await admin.from("allowed_codes").delete().eq("code", data.code);
      throw new Error("Falha ao criar usuário: " + authErr.message);
    }

    return { ok: true, code: data.code };
  });
