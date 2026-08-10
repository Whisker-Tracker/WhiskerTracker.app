import { SignupForm } from "@/components/forms/signup-form";
import messages_es from "@/messages/es.json";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const authMessages = messages_es.auth as Record<string, string>;

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
