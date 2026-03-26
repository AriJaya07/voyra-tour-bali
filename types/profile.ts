export interface UserProfile {
  id: number;
  email: string;
  name: string | null;
  image: string | null;
  phone: string | null;
  role: string;
}

export interface ProfileFormMessage {
  type: "success" | "error";
  text: string;
}
