(() => {
  let client;
  let session = null;
  let initialization;
  const sessionListeners = new Set();

  function publishSession(nextSession) {
    session = nextSession;
    for (const listener of sessionListeners) listener(session);
  }

  async function init() {
    if (initialization) return initialization;
    initialization = (async () => {
      const response = await fetch("/api/config");
      const config = await response.json();
      if (!response.ok) throw new Error(config?.error?.message || "Could not load app configuration.");
      if (!window.supabase?.createClient) throw new Error("Supabase sign-in could not be loaded.");
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      publishSession(data.session);
      client.auth.onAuthStateChange((_event, nextSession) => publishSession(nextSession));
      return session;
    })();
    return initialization;
  }

  async function request(path, options = {}) {
    await init();
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (session?.access_token) headers.set("Authorization", `Bearer ${session.access_token}`);
    const response = await fetch(path, { ...options, headers });
    if (response.status === 204) return null;
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(result?.error?.message || "The request could not be completed.");
      error.code = result?.error?.code;
      error.status = response.status;
      throw error;
    }
    return result;
  }

  async function signUp({ email, password, name }) {
    await init();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name },
        emailRedirectTo: `${location.origin}${location.pathname}${location.search}${location.hash}`
      }
    });
    if (error) throw error;
    publishSession(data.session);
    return data;
  }

  async function signIn({ email, password }) {
    await init();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    publishSession(data.session);
    return data;
  }

  async function signInWithGoogle() {
    await init();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}${location.pathname}${location.search}${location.hash}`,
        queryParams: { prompt: "select_account" }
      }
    });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await init();
    const { error } = await client.auth.signOut();
    if (error) throw error;
    publishSession(null);
  }

  window.NexusApi = {
    init,
    request,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    getSession: () => session,
    onSessionChange(listener) {
      sessionListeners.add(listener);
      return () => sessionListeners.delete(listener);
    }
  };
})();
