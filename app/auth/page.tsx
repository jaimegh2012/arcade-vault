import AuthView from "@/components/auth-view";

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const { error } = await searchParams;
  return <AuthView oauthError={error === "oauth"} />;
}
