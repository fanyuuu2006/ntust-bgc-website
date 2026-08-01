export default async function AdminPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-3xl font-bold">管理員專區</h1>
      <p className="text-lg text-gray-600">
        這裡是管理員專區，只有具有管理員權限的使用者可以存取。
      </p>
    </div>
  );
}
