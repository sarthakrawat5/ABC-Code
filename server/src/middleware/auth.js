import { ApiError } from "../errors.js";
import { createUserClient, supabaseAuth } from "../supabase.js";

export async function attachUser(request, _response, next) {
  const authorization = request.get("authorization") || "";
  if (!authorization) {
    request.db = supabaseAuth;
    return next();
  }
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) return next(new ApiError(401, "Sign in to continue.", "AUTH_REQUIRED"));

  const { data, error } = await supabaseAuth.auth.getUser(token);
  if (error || !data.user) return next(new ApiError(401, "Your session is invalid or has expired.", "INVALID_SESSION"));

  const db = createUserClient(token);
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("id,email,display_name,avatar_url,role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError || !profile) return next(new ApiError(403, "Your account profile is not ready.", "PROFILE_UNAVAILABLE"));

  request.user = data.user;
  request.profile = profile;
  request.db = db;
  return next();
}

export function requireAuth(request, _response, next) {
  if (!request.user || !request.db) return next(new ApiError(401, "Sign in to continue.", "AUTH_REQUIRED"));
  return next();
}

export function requireOrganizer(request, _response, next) {
  if (!["organizer", "admin"].includes(request.profile?.role)) {
    return next(new ApiError(403, "Organizer permission is required.", "ORGANIZER_REQUIRED"));
  }
  return next();
}

export async function assertClubOrganizer(request, clubId) {
  if (request.profile.role === "admin") return;
  const { data, error } = await request.db
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", request.user.id)
    .eq("role", "organizer")
    .maybeSingle();
  if (error) throw new ApiError(403, "Unable to verify club permissions.", "PERMISSION_CHECK_FAILED");
  if (!data) throw new ApiError(403, "You must organize this club to manage its events.", "CLUB_ORGANIZER_REQUIRED");
}
