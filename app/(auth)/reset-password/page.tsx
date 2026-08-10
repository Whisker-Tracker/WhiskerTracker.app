import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import messages_es from "@/messages/es.json";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const authMessages = messages_es.auth as Record<string, string>;

  return (
    <ResetPasswordForm
      passwordReset={authMessages.passwordReset}
      enterYourEmail={authMessages.enterYourEmail}
      sendingReset={authMessages.sendingReset}
      backToSignIn={authMessages.backToSignIn}
    />
  );
}
