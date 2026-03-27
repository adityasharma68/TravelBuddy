export default function Header() {
  return (
    <header className="bg-green-800 text-white p-4 flex justify-between items-center">
      <h1 className="font-bold text-lg">Travel Buddy</h1>
      <button className="bg-white text-black px-3 py-1 rounded">
        Logout
      </button>
    </header>
  );
}