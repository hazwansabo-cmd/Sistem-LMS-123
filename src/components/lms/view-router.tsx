"use client";
import { useUI } from "@/store/app";
import { DashboardView } from "@/components/lms/views/dashboard";
import { CoursesView } from "@/components/lms/views/courses";
import { CourseDetailView } from "@/components/lms/views/course-detail";
import { MyCoursesView } from "@/components/lms/views/my-courses";
import { LearningView } from "@/components/lms/views/learning";
import { QuizView } from "@/components/lms/views/quiz";
import { CourseEditorView } from "@/components/lms/views/course-editor";
import { AttendanceView } from "@/components/lms/views/attendance";
import { SessionQrView } from "@/components/lms/views/session-qr";
import { MyAttendanceView } from "@/components/lms/views/my-attendance";
import { AttendanceListView } from "@/components/lms/views/attendance-list";
import { AttendanceBulkView } from "@/components/lms/views/attendance-bulk";
import { AttendanceImportView } from "@/components/lms/views/attendance-import";
import { CorrectionsView } from "@/components/lms/views/corrections";
import { CertificatesView } from "@/components/lms/views/certificates";
import { VerifyCertView } from "@/components/lms/views/verify-cert";
import { ReportsView } from "@/components/lms/views/reports";
import { UsersView } from "@/components/lms/views/users";
import { DepartmentsView } from "@/components/lms/views/departments";
import { AuditLogView } from "@/components/lms/views/audit-log";
import { SettingsView } from "@/components/lms/views/settings";
import { ProfileView } from "@/components/lms/views/profile";
import { NotificationsView } from "@/components/lms/views/notifications";

export function ViewRouter() {
  const view = useUI((s) => s.view);

  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "courses":
      return <CoursesView />;
    case "course-detail":
      return <CourseDetailView />;
    case "my-courses":
      return <MyCoursesView />;
    case "learning":
      return <LearningView />;
    case "quiz":
      return <QuizView />;
    case "course-editor":
      return <CourseEditorView />;
    case "attendance":
      return <AttendanceView />;
    case "session-qr":
      return <SessionQrView />;
    case "my-attendance":
      return <MyAttendanceView />;
    case "attendance-list":
      return <AttendanceListView />;
    case "attendance-bulk":
      return <AttendanceBulkView />;
    case "attendance-import":
      return <AttendanceImportView />;
    case "corrections":
      return <CorrectionsView />;
    case "certificates":
      return <CertificatesView />;
    case "verify-cert":
      return <VerifyCertView />;
    case "reports":
      return <ReportsView />;
    case "users":
      return <UsersView />;
    case "departments":
      return <DepartmentsView />;
    case "audit-log":
      return <AuditLogView />;
    case "settings":
      return <SettingsView />;
    case "profile":
      return <ProfileView />;
    case "notifications":
      return <NotificationsView />;
    default:
      return <DashboardView />;
  }
}
