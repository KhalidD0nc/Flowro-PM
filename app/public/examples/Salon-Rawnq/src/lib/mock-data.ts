export type Service = {
  id: string;
  nameAr: string;
  descriptionAr: string;
  price: number;
  durationMinutes: number;
  isFeatured: boolean;
  isOnOffer: boolean;
  offerLabel?: string;
  image: string;
};

export type StaffMember = {
  id: string;
  nameAr: string;
  roleAr: string;
  isAvailable: boolean;
};

export type Booking = {
  id: string;
  serviceId: string;
  staffMemberId?: string;
  customerName: string;
  customerPhone: string;
  notes?: string;
  date: string;
  time: string;
  status: "confirmed" | "pending" | "cancelled";
  price: number;
  durationMinutes: number;
  createdAt: string;
};

export type AvailabilitySlot = {
  id: string;
  date: string;
  time: string;
  isAvailable: boolean;
  staffMemberId?: string;
};

export const mockServices: Service[] = [
  {
    id: "srv_1",
    nameAr: "باقة العروس الملكية",
    descriptionAr: "تجربة متكاملة ورعاية فائقة تشمل العناية بالبشرة، تسريحة الشعر المتقنة، والمكياج الاحترافي لليلة لا تنسى تمزج بين الفخامة والسكينة.",
    price: 1500,
    durationMinutes: 240,
    isFeatured: true,
    isOnOffer: true,
    offerLabel: "خصم 20%",
    image: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop"
  },
  {
    id: "srv_2",
    nameAr: "جلسة مساج استرخائي",
    descriptionAr: "مساج متعمق بالزيوت العطرية الساخنة لتخفيف التوتر اليومي وإعادة التوازن المثالي للجسم والعقل في أجواء هادئة.",
    price: 350,
    durationMinutes: 60,
    isFeatured: true,
    isOnOffer: false,
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop"
  },
  {
    id: "srv_3",
    nameAr: "عناية الأظافر الملكية",
    descriptionAr: "تنظيف، تقليم، وتلوين الأظافر بمواد أصلية وعالية الجودة تدوم طويلاً، مع تدليك خفيف لليدين لتجربة مريحة.",
    price: 150,
    durationMinutes: 45,
    isFeatured: false,
    isOnOffer: false,
    image: "https://images.unsplash.com/photo-1583416750470-965b2707b355?w=800&auto=format&fit=crop"
  },
  {
    id: "srv_4",
    nameAr: "تنظيف البشرة العميق",
    descriptionAr: "إزالة الشوائب وتفتيح المسام باستخدام أجهزة متقدمة وماسكات طبيعية فاخرة لبشرة نضرة ومشرقة تعكس صحتك.",
    price: 450,
    durationMinutes: 90,
    isFeatured: false,
    isOnOffer: true,
    offerLabel: "الأكثر طلباً",
    image: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=800&auto=format&fit=crop"
  }
];

export const mockStaffMembers: StaffMember[] = [
  { id: "stf_1", nameAr: "سارة أحمد", roleAr: "أخصائية بشرة", isAvailable: true },
  { id: "stf_2", nameAr: "نورة القحطاني", roleAr: "خبيرة شعر", isAvailable: true },
  { id: "stf_3", nameAr: "ريم عبدالله", roleAr: "أخصائية مساج", isAvailable: false },
];

export const mockAvailabilitySlots: AvailabilitySlot[] = [
  { id: "slot_1", date: "2026-05-10", time: "10:00 ص", isAvailable: true },
  { id: "slot_2", date: "2026-05-10", time: "11:30 ص", isAvailable: true },
  { id: "slot_3", date: "2026-05-10", time: "02:00 م", isAvailable: false },
  { id: "slot_4", date: "2026-05-10", time: "04:30 م", isAvailable: true },
  { id: "slot_5", date: "2026-05-11", time: "09:00 ص", isAvailable: true },
  { id: "slot_6", date: "2026-05-11", time: "01:00 م", isAvailable: true },
];

export const mockBookings: Booking[] = [
  {
    id: "bk_9a8b7c6d",
    serviceId: "srv_4",
    staffMemberId: "stf_1",
    customerName: "حصة المري",
    customerPhone: "0551234567",
    date: "2026-05-10",
    time: "10:00 ص",
    status: "confirmed",
    price: 450,
    durationMinutes: 90,
    createdAt: "2026-05-01T10:00:00Z"
  },
  {
    id: "bk_1a2b3c4d",
    serviceId: "srv_2",
    customerName: "أمينة فهد",
    customerPhone: "0509876543",
    date: "2026-05-11",
    time: "01:00 م",
    status: "pending",
    price: 350,
    durationMinutes: 60,
    createdAt: "2026-05-02T14:30:00Z"
  }
];
