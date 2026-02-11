'use client';

import { useEffect } from "react";
import Image from "next/image";

export default function Home() {

  useEffect(() => {
    const fetchPointStudy = async () => {
      try {
        const mockData = {
          SiteId: "DN1078 (TEST-032)",
          StructureType: "Utility Pole",
          Latitude: "40.03065",
          Longitude: "-105.2725",
          StudyOf: "New Construction",
          SiteElevation: "277",
          AGL: "35",
          AMSL: "35",
          State: "CO",
          StudyCriteria: "Notice,Obstruction,Departure,Vfr,Airway,Airnav,FCC,Obstacle,COM,Airport,Private",
          StudyType: "Full",
          StickDistance: "40000",
          Range: "40"
        };

        const response = await fetch('/api/pointstudy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockData),
        });
        const data = await response.json();
        console.log('Point study data:', data);
      } catch (error) {
        console.error('Error fetching point study:', error);
      }
    };

    fetchPointStudy();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        
        
        <button className="bg-blue-500 text-white hover:bg-blue-600 rounded p-4 cursor-pointer">
          Upload CSV
          </button>
      </main>
    </div>
  );
}
