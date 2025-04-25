import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/imageUtils';

export default function TestR2() {
  const [urlInfo, setUrlInfo] = useState({
    bucket: import.meta.env.VITE_R2_BUCKET_NAME || 'not-set',
    accountId: import.meta.env.VITE_R2_ACCOUNT_ID || 'not-set',
  });
  
  const [testUrls, setTestUrls] = useState<string[]>([]);
  
  useEffect(() => {
    // Test scenarios
    const testCases = [
      { url: 'test-file.jpg' },
      { url: '/uploads/test-file.jpg' },
      { url: 'uploads/test-file.jpg' },
      { url: 'https://example.com/image.jpg' }
    ];
    
    const generatedUrls = testCases.map(photo => ({
      original: photo.url,
      generated: getImageUrl(photo)
    }));
    
    console.log('Generated URLs:', generatedUrls);
    
    // Format for display
    const formattedUrls = generatedUrls.map(item => 
      `Original: ${item.original} → Generated: ${item.generated}`
    );
    
    setTestUrls(formattedUrls);
  }, []);
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">R2 URL Generation Test</h1>
      
      <div className="bg-gray-100 p-4 rounded mb-6">
        <h2 className="text-lg font-semibold mb-2">Environment Variables</h2>
        <p><strong>VITE_R2_BUCKET_NAME:</strong> {urlInfo.bucket}</p>
        <p><strong>VITE_R2_ACCOUNT_ID:</strong> {urlInfo.accountId}</p>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Test URLs</h2>
        <ul className="space-y-2">
          {testUrls.map((url, index) => (
            <li key={index} className="font-mono text-sm">{url}</li>
          ))}
        </ul>
      </div>
      
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold mb-2">Image Loading Test</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-md font-medium mb-2">Valid R2 Image (should load)</h3>
            <div className="border border-gray-300 rounded p-2 bg-gray-50 h-40 flex items-center justify-center">
              <img 
                src={`https://${urlInfo.bucket}.${urlInfo.accountId}.r2.dev/test-image.jpg`}
                alt="Valid R2 image"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.jpg";
                  console.log("Falling back to placeholder for valid image test");
                }}
              />
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">Invalid Image (should show placeholder)</h3>
            <div className="border border-gray-300 rounded p-2 bg-gray-50 h-40 flex items-center justify-center">
              <img 
                src="https://does-not-exist-72771.jpg"
                alt="Invalid image"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/placeholder.jpg";
                  console.log("Falling back to placeholder for invalid image test");
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}