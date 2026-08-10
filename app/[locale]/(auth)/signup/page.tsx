import { SignupForm } from "@/components/forms/signup-form";
import messages_en from "@/messages/en.json";
import messages_es from "@/messages/es.json";

const messagesMap: Record<string, Record<string, unknown>> = {
  en: messages_en as unknown as Record<string, unknown>,
  es: messages_es as unknown as Record<string, unknown>,
};

export const dynamic = "force-dynamic";

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = messagesMap[locale] ?? messagesMap.en;
  const authMessages = messages.auth as Record<string, string>;

  return (
    <SignupForm
      signUp={authMessages.signUp}
      creatingAccount={authMessages.creatingAccount}
      alreadyHaveAccount={authMessages.alreadyHaveAccount}
      signInLink={authMessages.signInLink}
      joinRescueTeam={authMessages.joinRescueTeam}
      fullName={authMessages.fullName}
      minimumCharacters={authMessages.minimumCharacters}
    />
  );
}
