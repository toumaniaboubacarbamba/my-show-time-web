import type {
  AdminStats,
  AdminUser,
  AdminUserFilters,
  AppNotification,
  Booking,
  Concert,
  ConcertFilters,
  ConcertInput,
  Favorite,
  Paginated,
  Role,
  TicketCheck,
  UpdateProfileInput,
  User,
} from "./types";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

const TOKEN_KEY = "mst_token";

export const tokenStore = {
  get(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    window.localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    window.localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const token = auth ? tokenStore.get() : null;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
  } catch {
    throw new ApiError(0, "Impossible de joindre le serveur. Vérifie ta connexion.");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Nest renvoie { statusCode, message: string | string[], error }
    const raw = data?.message;
    const message = Array.isArray(raw)
      ? raw.join(" · ")
      : (raw ?? "Une erreur est survenue.");
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/* ---------- Normalisation (tolère _id/id, access_token/token) ---------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(raw: any): User {
  return {
    id: String(raw._id ?? raw.id ?? raw.sub ?? ""),
    email: raw.email,
    role: (raw.role ?? "user") as Role,
  };
}

/* ---------- Auth ---------- */

export const authApi = {
  async login(email: string, password: string): Promise<string> {
    const data = await request<Record<string, string>>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
    const token = data.access_token ?? data.accessToken ?? data.token;
    if (!token) throw new ApiError(500, "Réponse de connexion inattendue.");
    return token;
  },

  register(email: string, password: string) {
    return request<unknown>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    });
  },

  async me(): Promise<User> {
    return toUser(await request("/users/me"));
  },
};

/* ---------- Concerts ---------- */

export const concertsApi = {
  list(filters: ConcertFilters = {}) {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    });
    const query = qs.toString();
    return request<Paginated<Concert>>(`/concerts${query ? `?${query}` : ""}`, {
      auth: false,
    });
  },

  get(id: string) {
    return request<Concert>(`/concerts/${id}`, { auth: false });
  },

  // --- Administration (token admin requis) ---
  create(input: ConcertInput) {
    return request<Concert>("/concerts", { method: "POST", body: JSON.stringify(input) });
  },

  update(id: string, input: Partial<ConcertInput>) {
    return request<Concert>(`/concerts/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  remove(id: string) {
    return request<void>(`/concerts/${id}`, { method: "DELETE" });
  },
};

/* ---------- Admin ---------- */

export const adminApi = {
  stats(days = 30) {
    return request<AdminStats>(`/admin/stats?days=${days}`);
  },

  listUsers(filters: AdminUserFilters = {}) {
    const qs = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    });
    const query = qs.toString();
    return request<Paginated<AdminUser>>(`/admin/users${query ? `?${query}` : ""}`);
  },

  createUser(input: { email: string; password: string; role: Role }) {
    return request<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(input) });
  },

  updateUser(id: string, input: { email?: string; password?: string }) {
    return request<AdminUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  },

  setUserRole(id: string, role: Role) {
    return request<AdminUser>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
  },

  removeUser(id: string) {
    return request<void>(`/admin/users/${id}`, { method: "DELETE" });
  },
};

/* ---------- Réservations ---------- */

export const bookingsApi = {
  create(concertId: string, quantity: number) {
    return request<unknown>("/bookings", {
      method: "POST",
      body: JSON.stringify({ concertId, quantity }),
    });
  },

  mine() {
    return request<Booking[]>("/bookings/me");
  },

  cancel(id: string) {
    return request<unknown>(`/bookings/${id}/cancel`, { method: "PATCH" });
  },

  // Réservé au staff (admin) : marque le billet comme utilisé à l'entrée
  checkIn(reference: string) {
    return request<TicketCheck>(`/bookings/check-in/${encodeURIComponent(reference)}`, {
      method: "PATCH",
    });
  },

  // Page publique : pas besoin d'être connecté
  verify(reference: string) {
    return request<TicketCheck>(
      `/bookings/verify/${encodeURIComponent(reference)}`,
      { auth: false },
    );
  },

  /**
   * L'endpoint renvoie une image PNG protégée par le token : un <img src> ne peut
   * pas envoyer l'en-tête Authorization. On télécharge donc l'image avec fetch,
   * puis on la transforme en URL locale (blob:) utilisable dans <img>.
   * L'appelant doit libérer l'URL avec URL.revokeObjectURL().
   */
  async qrCodeUrl(id: string): Promise<string> {
    const token = tokenStore.get();
    const res = await fetch(`${API_URL}/bookings/${id}/qrcode`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => null);
    if (!res || !res.ok) {
      throw new ApiError(res?.status ?? 0, "QR code indisponible pour le moment.");
    }
    return URL.createObjectURL(await res.blob());
  },
};

/* ---------- Favoris ---------- */

export const favoritesApi = {
  async list(): Promise<Favorite[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await request<any>("/favorites");
    const rows = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((r: any) => ({ id: String(r._id ?? r.id), band: r.band }));
  },

  add(band: string) {
    return request<unknown>("/favorites", {
      method: "POST",
      body: JSON.stringify({ band }),
    });
  },

  remove(id: string) {
    return request<void>(`/favorites/${id}`, { method: "DELETE" });
  },
};

/* ---------- Notifications ---------- */

export const notificationsApi = {
  mine() {
    return request<AppNotification[]>("/notifications");
  },
  markRead(id: string) {
    return request<unknown>(`/notifications/${id}/read`, { method: "PATCH" });
  },
  readAll() {
    return request<unknown>("/notifications/read-all", { method: "PATCH" });
  },
};

/* ---------- Profil ---------- */

export const usersApi = {
  updateMe(input: UpdateProfileInput) {
    return request<unknown>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};
