import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import messages_en from "@/messages/en.json";
import messages_es from "@/messages/es.json";

const messagesMap: Record<string, Record<string, unknown>> = {
  en: messages_en as unknown as Record<string, unknown>,
  es: messages_es as unknown as Record<string, unknown>,
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = messagesMap[locale] ?? messagesMap.en;
  const authMessages = messages.auth as Record<string, string>;

  return (
    <ResetPasswordForm
      passwordReset={authMessages.passwordReset}
      enterYourEmail={authMessages.enterYourEmail}
      sendingReset={authMessages.sendingReset}
      backToSignIn={authMessages.backToSignIn}
    />
  );
}
