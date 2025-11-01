export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  // ตอนนี้ไม่ต้องมี SessionProvider ของ next-auth แล้ว
  // ถ้ามี provider อื่น เช่น Theme/QueryClient ค่อยมาวางเพิ่มได้ทีหลัง
  return <>{children}</>;
}
