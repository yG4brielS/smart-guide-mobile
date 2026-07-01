import { supabase } from "@/integrations/supabase/client";
import { validateSignupCode } from "@/lib/users.functions";

// Email sintético — o usuário só usa o código.
export function codeToEmail(code: string): string {
  const clean = code.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${clean}@bem-estar.app`;
}

export interface AllowedCode {
  code: string;
  full_name: string;
  role: "atleta" | "psicologo" | "treinador";
  used: boolean;
}

export async function findAllowedCode(code: string): Promise<AllowedCode | null> {
  return await validateSignupCode({ data: { code: code.trim() } });
}

/**
 * Login por código:
 * - valida na tabela allowed_codes
 * - se ainda não usado, faz signUp (senha = código)
 * - depois faz signIn com a senha informada (na primeira vez = código)
 */
export async function signInWithCode(code: string, password: string) {
  const allowed = await findAllowedCode(code);
  if (!allowed) {
    throw new Error("Código não autorizado. Procure o responsável.");
  }
  const email = codeToEmail(code);

  if (!allowed.used) {
    // primeira vez — cria a conta. senha inicial = código.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: code, // senha inicial sempre = código
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { code: allowed.code },
      },
    });
    if (signUpError && !signUpError.message.toLowerCase().includes("already")) {
      throw signUpError;
    }
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  if (newPassword.length < 6) throw new Error("A senha deve ter ao menos 6 caracteres.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;

  const { data: u } = await supabase.auth.getUser();
  if (u.user) {
    await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("user_id", u.user.id);
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}
