import { create } from "zustand";
import type { ProductSource } from "@/types/bookingFlow";

export interface PaxMixItem {
  ageBand: string;
  numberOfTravelers: number;
}

export interface TravelerInfo {
  ageBand: string;
  firstName: string;
  lastName: string;
}

export interface BookingQuestion {
  questionId: string;
  question: string;
  required: boolean;
  inputType: string;
  allowedAnswers?: string[];
}

export interface BookingQuestionAnswer {
  questionId: string;
  answer: string;
}

export interface PickupLocation {
  ref: string;
  name: string;
  description?: string;
}

export interface LanguageGuideOption {
  type: string;
  language: string;
}

export interface AvailabilitySlot {
  productOptionCode: string;
  startTime?: string;
  tourGradeCode?: string;
  available: boolean;
  totalPrice: number;
  partnerNetPrice?: number;
  currencyCode: string;
}

interface BookingStore {
  // Product source — determines checkout flow
  source: ProductSource;
  viatorUrl: string;

  // Step 0: Product selection (from BookingWidget)
  productCode: string;
  productTitle: string;
  productImage: string;
  productOptionCode: string;
  travelDate: string;
  startTime: string;
  tourGradeCode: string;
  paxMix: PaxMixItem[];
  totalPrice: number;
  currency: string;
  cancellationPolicy: string;

  // Step 1: Contact info
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    confirmEmail: string;
    phone: string;
  };

  // Step 2: Travelers
  travelers: TravelerInfo[];

  // Step 3: Activity details (dynamic from Viator product data)
  availablePickupLocations: PickupLocation[];
  availableLanguageGuides: LanguageGuideOption[];
  pickupType: string; // e.g. "PICKUP_AND_MEET_AT_START_POINT"
  allowCustomPickup: boolean;
  meetingPoint: string;
  languageGuide: string;
  bookingQuestions: BookingQuestion[];
  bookingQuestionAnswers: BookingQuestionAnswer[];

  // UI state
  currentStep: number;
  isLoading: boolean;

  // Actions
  setProductSelection: (data: Partial<BookingStore>) => void;
  setContactInfo: (info: BookingStore["contactInfo"]) => void;
  setTravelers: (travelers: TravelerInfo[]) => void;
  setMeetingPoint: (point: string) => void;
  setLanguageGuide: (lang: string) => void;
  setBookingQuestions: (questions: BookingQuestion[]) => void;
  setBookingQuestionAnswer: (questionId: string, answer: string) => void;
  setCurrentStep: (step: number) => void;
  setIsLoading: (loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  source: "VIATOR" as ProductSource,
  viatorUrl: "",
  productCode: "",
  productTitle: "",
  productImage: "",
  productOptionCode: "",
  travelDate: "",
  startTime: "",
  tourGradeCode: "",
  paxMix: [],
  totalPrice: 0,
  currency: "USD",
  cancellationPolicy: "",
  contactInfo: {
    firstName: "",
    lastName: "",
    email: "",
    confirmEmail: "",
    phone: "",
  },
  travelers: [],
  availablePickupLocations: [],
  availableLanguageGuides: [],
  pickupType: "",
  allowCustomPickup: false,
  meetingPoint: "",
  languageGuide: "",
  bookingQuestions: [],
  bookingQuestionAnswers: [],
  currentStep: 0,
  isLoading: false,
};

export const useBookingStore = create<BookingStore>((set) => ({
  ...initialState,

  setProductSelection: (data) => set((state) => ({ ...state, ...data })),

  setContactInfo: (info) => set({ contactInfo: info }),

  setTravelers: (travelers) => set({ travelers }),

  setMeetingPoint: (point) => set({ meetingPoint: point }),

  setLanguageGuide: (lang) => set({ languageGuide: lang }),

  setBookingQuestions: (questions) => set({ bookingQuestions: questions }),

  setBookingQuestionAnswer: (questionId, answer) =>
    set((state) => {
      const existing = state.bookingQuestionAnswers.filter(
        (a) => a.questionId !== questionId
      );
      return {
        bookingQuestionAnswers: [...existing, { questionId, answer }],
      };
    }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setIsLoading: (loading) => set({ isLoading: loading }),

  reset: () => set(initialState),
}));
