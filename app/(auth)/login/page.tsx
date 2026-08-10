import { LoginForm } from "@/components/forms/login-form";
import messages_es from "@/messages/es.json";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const authMessages = messages_es.auth as Record<string, string>;

  return (
    <LoginForm
      signIn={authMessages.signIn}
      accessYourDashboard={authMessages.accessYourDashboard}
      password={authMessages.password}
      signingIn={authMessages.signingIn}
      dontHaveAccount={authMessages.dontHaveAccount}
      passwordReset={authMessages.passwordReset}
    />
  );
}
