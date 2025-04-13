import { useAuth } from "@/providers/auth-provider";

export default function UserMenu() {
  const { user } = useAuth();
  
  if (!user) return null;
  
  // Create initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Determine background color based on role
  const bgColor = user.role === 'admin' ? 'bg-red-700' : 'bg-gray-700';

  return (
    <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
      <div className="flex-shrink-0 w-full group block">
        <div className="flex items-center">
          <div>
            <div className={`h-9 w-9 rounded-full ${bgColor} flex items-center justify-center text-white font-medium text-sm`}>
              {getInitials(user.name)}
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">
              {user.name}
            </p>
            <p className="text-xs font-medium text-gray-300">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
