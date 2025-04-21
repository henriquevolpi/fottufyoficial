import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DebugPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [cookies, setCookies] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  const [email, setEmail] = useState('admin@studio.com');
  const [password, setPassword] = useState('admin123');

  // Get session data on page load
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      // Try to fetch the current user
      const userResponse = await fetch('/api/user', {
        credentials: 'include',
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUserData(userData);
        setLoginStatus('Logged in');
      } else {
        setUserData(null);
        setLoginStatus('Not logged in');
      }
      
      // Get the current cookies
      setCookies(document.cookie);
      
    } catch (error) {
      console.error('Error checking session:', error);
      setLoginStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const user = await response.json();
        setUserData(user);
        setLoginStatus('Login successful');
        setCookies(document.cookie);
      } else {
        const error = await response.text();
        setLoginStatus(`Login failed: ${error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setUserData(null);
        setLoginStatus('Logged out');
        setCookies(document.cookie);
      } else {
        const error = await response.text();
        setLoginStatus(`Logout failed: ${error}`);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setLoginStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Authentication Debugging Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2"><strong>Status:</strong> {loginStatus}</p>
            <p className="mb-4"><strong>Cookies:</strong> {cookies || 'No cookies found'}</p>
            
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="border p-2 rounded"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="border p-2 rounded"
                />
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={login} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  Login
                </Button>
                <Button 
                  onClick={logout} 
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  Logout
                </Button>
                <Button 
                  onClick={checkSession} 
                  disabled={isLoading}
                  variant="secondary"
                  className="flex-1"
                >
                  Check Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>User Data</CardTitle>
          </CardHeader>
          <CardContent>
            {userData ? (
              <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(userData, null, 2)}
              </pre>
            ) : (
              <p>No user data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}