export const mockHabits = [
  {
    id: "h-1",
    title: "التأمل الصباحي",
    description: "١٠ دقائق من التأمل للبدء بيوم هادئ",
    frequency: "يومياً",
    isActive: true,
    streakCount: 5,
    bestStreak: 12,
    completedToday: true,
    createdAt: "2025-01-10T08:00:00Z"
  },
  {
    id: "h-2",
    title: "قراءة صفحتين",
    description: "قراءة كتاب قبل النوم لتعزيز التعلم",
    frequency: "يومياً",
    isActive: true,
    streakCount: 21,
    bestStreak: 21,
    completedToday: false,
    createdAt: "2025-01-05T20:00:00Z"
  },
  {
    id: "h-3",
    title: "شرب ٢ لتر ماء",
    description: "الحفاظ على الترطيب العالي طوال اليوم",
    frequency: "يومياً",
    isActive: true,
    streakCount: 0,
    bestStreak: 7,
    completedToday: false,
    createdAt: "2025-01-20T07:30:00Z"
  },
  {
    id: "h-4",
    title: "الركض",
    description: "الركض لمسافة ٣ كم في الحديقة",
    frequency: "٣ أيام في الأسبوع",
    isActive: true,
    streakCount: 2,
    bestStreak: 5,
    completedToday: true,
    createdAt: "2025-02-01T06:00:00Z"
  }
];

export const mockNotifications = [
  {
    id: "n-1",
    title: "لقد حققت أطول سلسلة!",
    message: "تهانينا! سلسلة القراءة مستمرة لـ ٢١ يوماً متتالياً.",
    type: "success",
    isRead: false,
    createdAt: "2025-02-15T09:00:00Z"
  },
  {
    id: "n-2",
    title: "تذكير: شرب الماء",
    message: "لم تقم بتسجيل شرب الماء اليوم، لا تنسَ إبقاء جسمك رطباً.",
    type: "warning",
    isRead: true,
    createdAt: "2025-02-15T14:30:00Z"
  }
];

export const mockStats = {
  activeHabits: 4,
  completedTodayCount: 2,
  averageCompletionRate: "78%",
  longestActiveStreak: 21
};

export const mockExports = [
  {
    id: "e-1",
    format: "PDF",
    status: "completed",
    requestedAt: "2025-02-10T11:20:00Z",
    downloadUrl: "#"
  },
  {
    id: "e-2",
    format: "Excel",
    status: "processing",
    requestedAt: "2025-02-15T15:45:00Z",
    downloadUrl: ""
  }
];
