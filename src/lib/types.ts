export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Concert {
  _id: string;
  title: string;
  band: string;
  genre: string;
  date: string; // ISO
  venue: string;
  totalSeats: number;
  availableSeats: number;
  price: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ConcertFilters {
  search?: string;
  genre?: string;
  date?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

export interface Favorite {
  id: string;
  band: string;
}

export type BookingStatus = "confirmed" | "cancelled";

export interface BookingConcert {
  _id: string;
  title: string;
  band: string;
  date: string;
  venue: string;
}

export interface Booking {
  _id: string;
  reference: string;
  status: BookingStatus;
  quantity: number;
  totalPrice: number;
  concert: BookingConcert | null;
  createdAt: string;
}

// Réponse de GET /bookings/verify/:reference (publique, sans _id)
export type TicketCheck = Omit<Booking, "_id" | "createdAt"> & {
  // date d'entrée enregistrée par le contrôle (null/absent = billet pas encore utilisé)
  checkedInAt?: string | null;
};

export interface AppNotification {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
  // null, un identifiant, ou un concert complet selon la route
  concert: string | { _id: string } | null;
}

export interface UpdateProfileInput {
  currentPassword: string;
  email?: string;
  newPassword?: string;
}

export interface ConcertInput {
  title: string;
  band: string;
  genre: string;
  date: string; // ISO
  venue: string;
  totalSeats: number;
  price: number;
}

export interface AdminStats {
  summary: {
    confirmedBookings: number;
    cancelledBookings: number;
    cancellationRate: number;
    ticketsSold: number;
    revenue: number;
  };
  topConcerts: {
    concertId: string;
    title: string;
    band: string;
    date: string;
    bookings: number;
    tickets: number;
    revenue: number;
    fillRate: number;
  }[];
  byGenre: { genre: string; tickets: number; revenue: number }[];
  daily: { date: string; bookings: number; tickets: number; revenue: number }[];
}

export interface AdminUser {
  _id: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface AdminUserFilters {
  search?: string;
  role?: Role | "";
  page?: number;
  limit?: number;
}
