'use client';

import { useEffect, useState } from "react";
import Image from "next/image";

export default function Home() {
  const [studyData, setStudyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    
    try {
      // Read the CSV file
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse CSV rows (skip header)
      const sites = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          
          // Create object mapping headers to values
          const site = {
            status: 'pending'
          };
          
          headers.forEach((header, index) => {
            site[header] = values[index]?.trim() || '';
          });
          
          sites.push(site);
        }
      }
      
      // Update display immediately to show pending sites
      setStudyData([...sites]);
      
      // Send request for each site
      for (let i = 0; i < sites.length; i++) {
        const site = sites[i];
        
        try {
          // Use the parsed CSV data, remove UI-specific fields and empty values
          const { status, errorMessage, ...allData } = site;
          
          // Filter out empty values
          const requestData = {};
          Object.keys(allData).forEach(key => {
            if (allData[key] && allData[key].trim() !== '') {
              requestData[key] = allData[key];
            }
          });
          
          console.log(requestData)

          const response = await fetch('/api/pointstudy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
          });
          
          const data = await response.json();
          console.log('Point study data for', site.SiteId, ':', data);
          
          // Update this site's status
          sites[i].status = 'completed';
          
          // Update the display
          setStudyData([...sites]);
          
        } catch (err) {
          console.error('Error for site', site.SiteId, ':', err);
          sites[i].status = 'error';
          sites[i].errorMessage = err.message;
          setStudyData([...sites]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error reading CSV:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-start gap-8 py-32 px-16 bg-white dark:bg-black">
        
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="csv-upload"
        />
        
        <label htmlFor="csv-upload">
          <div className="bg-blue-500 text-white hover:bg-blue-600 rounded p-4 cursor-pointer">
            Upload CSV
          </div>
        </label>

        <div className="w-full">
          {loading && <p className="text-gray-600">Processing sites...</p>}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {studyData.length > 0 && (
            <div className="w-full">
              <h2 className="text-xl font-bold mb-4">FAA Point Study Requests</h2>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 font-semibold flex items-center gap-4">
                  <span className="w-20">Status</span>
                  <span>Site ID</span>
                </div>
                {studyData.map((site, index) => (
                  <div key={index} className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-8 border-t">
                    {site.status === 'pending' && (
                      <span className="w-5 h-5 border-2 border-gray-400 rounded animate-spin"></span>
                    )}
                    {site.status === 'completed' && (
                      <input 
                        type="checkbox" 
                        checked
                        readOnly
                        className="w-5 h-5 text-green-600"
                      />
                    )}
                    {site.status === 'error' && (
                      <span className="w-5 h-5 text-red-600 font-bold">✗</span>
                    )}
                    <span>{site.SiteId}</span>
                    {site.status === 'error' && site.errorMessage && (
                      <span className="text-red-600 text-sm ml-4">{site.errorMessage}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}