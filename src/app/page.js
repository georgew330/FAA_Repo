'use client';

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [validatedData, setValidatedData] = useState([]);
  const [submissionResults, setSubmissionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showSubmitButton, setShowSubmitButton] = useState(false);

  // Validation functions
  const validateLatitude = (lat) => {
  // Check if the entire string is a valid number
  if (!/^-?\d+\.?\d*$/.test(lat.trim())) return false;
  const num = parseFloat(lat);
  return !isNaN(num) && num >= -90 && num <= 90;
  };

  const validateLongitude = (lon) => {
  // Check if the entire string is a valid number
  if (!/^-?\d+\.?\d*$/.test(lon.trim())) return false;
  const num = parseFloat(lon);
  return !isNaN(num) && num >= -180 && num <= 180;
  };

  const validateNumber = (value) => {
  if (!value || value.trim() === '') return false;
  // Check if the entire string is a valid number
  return /^-?\d+\.?\d*$/.test(value.trim());
  };

  const validateState = (state) => {
    const validStates = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
    return validStates.includes(state?.toUpperCase());
  };

  const validateStructureType = (type) => {
    const validTypes = ['Utility Pole', 'Antenna Tower', 'Building', 'Bridge', 'Crane', 'Non-Antenna Structure', 'Other'];
    return validTypes.includes(type);
  };

  const validateRow = (site) => {
    const issues = [];

    // Required fields
    if (!site.SiteId || site.SiteId.trim() === '') {
      issues.push('Missing SiteId');
    }
    if (!site.StructureType || site.StructureType.trim() === '') {
      issues.push('Missing StructureType');
    } else if (!validateStructureType(site.StructureType)) {
      issues.push(`Invalid StructureType: "${site.StructureType}"`);
    }
    if (!site.Latitude || site.Latitude.trim() === '') {
      issues.push('Missing Latitude');
    } else if (!validateLatitude(site.Latitude)) {
      issues.push(`Invalid Latitude: "${site.Latitude}"`);
    }
    if (!site.Longitude || site.Longitude.trim() === '') {
      issues.push('Missing Longitude');
    } else if (!validateLongitude(site.Longitude)) {
      issues.push(`Invalid Longitude: "${site.Longitude}"`);
    }
    if (!site.State || site.State.trim() === '') {
      issues.push('Missing State');
    } else if (!validateState(site.State)) {
      issues.push(`Invalid State: "${site.State}"`);
    }
    if (!site.AGL || site.AGL.trim() === '') {
      issues.push('Missing AGL');
    } else if (!validateNumber(site.AGL)) {
      issues.push(`Invalid AGL: "${site.AGL}"`);
    }

    // Numeric validations
    if (site.SiteElevation && !validateNumber(site.SiteElevation)) {
      issues.push(`Invalid SiteElevation: "${site.SiteElevation}"`);
    }
    // AMSL only required if SiteElevation is provided
    if (site.SiteElevation && site.SiteElevation.trim() !== '') {
      if (!site.AMSL || site.AMSL.trim() === '') {
        issues.push('AMSL is required when SiteElevation is provided');
      } else if (!validateNumber(site.AMSL)) {
        issues.push(`Invalid AMSL: "${site.AMSL}"`);
      }
    }
    if (site.StickDistance && !validateNumber(site.StickDistance)) {
      issues.push(`Invalid StickDistance: "${site.StickDistance}"`);
    }
    if (site.Range && !validateNumber(site.Range)) {
      issues.push(`Invalid Range: "${site.Range}"`);
    }

    // Logic validation: AMSL should equal SiteElevation + AGL (only if all three are provided)
    if (site.SiteElevation && site.SiteElevation.trim() !== '' && 
      site.AGL && site.AGL.trim() !== '' && 
      site.AMSL && site.AMSL.trim() !== '') {
    const calculatedAMSL = parseFloat(site.SiteElevation) + parseFloat(site.AGL);
    if (Math.abs(calculatedAMSL - parseFloat(site.AMSL)) > 0.01) {
    issues.push(`AMSL mismatch: Should be ${calculatedAMSL} (SiteElevation + AGL)`);
    }
  }

    return {
      isValid: issues.length === 0,
      issues: issues
    };
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setValidatedData([]);
    setSubmissionResults([]);
    setShowSubmitButton(false);
    
    try {
      // Read the CSV file
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Parse and validate CSV rows
      const sites = [];
      let validCount = 0;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          
          // Create object mapping headers to values
          const site = {};
          headers.forEach((header, index) => {
            site[header] = values[index]?.trim() || '';
          });
          
          // Validate the row
          const validation = validateRow(site);
          
          sites.push({
            ...site,
            validationStatus: validation.isValid ? 'valid' : 'invalid',
            validationIssues: validation.issues,
            submissionStatus: 'pending' // Will be used when submitting
          });

          if (validation.isValid) validCount++;
        }
      }
      
      setValidatedData(sites);
      setShowSubmitButton(validCount > 0);
      setLoading(false);

    } catch (error) {
      console.error('Error reading CSV:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmitValidRequests = async () => {
    setSubmitting(true);
    
    // Filter only valid rows
    const validSites = validatedData.filter(site => site.validationStatus === 'valid');
    
    // Create a copy for tracking submission
    const resultsData = [...validatedData];
    setSubmissionResults(resultsData);

    // Send request for each valid site
    for (let i = 0; i < resultsData.length; i++) {
      const site = resultsData[i];
      
      // Skip invalid sites
      if (site.validationStatus !== 'valid') {
        site.submissionStatus = 'skipped';
        setSubmissionResults([...resultsData]);
        continue;
      }

      site.submissionStatus = 'submitting';
      setSubmissionResults([...resultsData]);
      
      try {
        // Build request using ALL fields from CSV
        const requestData = {
          SiteId: site.SiteId,
          StructureType: site.StructureType,
          Latitude: site.Latitude,
          Longitude: site.Longitude,
          StudyOf: site.StudyOf || 'New Construction',
          SiteElevation: site.SiteElevation,
          AGL: site.AGL,
          AMSL: site.AMSL,
          State: site.State,
          StudyCriteria: site.StudyCriteria || 'All',
          StudyType: site.StudyType,
          StickDistance: site.StickDistance || '40000',
          Range: site.Range || '40'
        };

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
        site.submissionStatus = 'completed';
        site.apiResponse = data;
        setSubmissionResults([...resultsData]);
        
      } catch (err) {
        console.error('Error for site', site.SiteId, ':', err);
        site.submissionStatus = 'error';
        site.submissionError = err.message;
        setSubmissionResults([...resultsData]);
      }
    }
    
    setSubmitting(false);
  };

  const getValidCount = () => {
    return validatedData.filter(site => site.validationStatus === 'valid').length;
  };

  const getInvalidCount = () => {
    return validatedData.filter(site => site.validationStatus === 'invalid').length;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-start gap-8 py-32 px-16 bg-white dark:bg-black">
        
        <input 
          type="file" 
          accept=".csv"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="csv-upload"
          disabled={submitting}
        />
        
        <label htmlFor="csv-upload">
          <div className={`${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 cursor-pointer'} text-white rounded p-4`}>
            Upload CSV
          </div>
        </label>

        <div className="w-full">
          {loading && <p className="text-gray-600">Validating CSV...</p>}
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {/* Validation Results */}
          {validatedData.length > 0 && submissionResults.length === 0 && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Validation Results</h2>
                <div className="text-sm">
                  <span className="text-green-600 font-semibold">Valid: {getValidCount()}</span>
                  <span className="mx-2">|</span>
                  <span className="text-red-600 font-semibold">Invalid: {getInvalidCount()}</span>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 font-semibold flex items-center gap-4">
                  <span className="w-20">Status</span>
                  <span className="w-48">Site ID</span>
                  <span className="flex-1">Issues</span>
                </div>
                {validatedData.map((site, index) => (
                  <div key={index} className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-4 border-t">
                    <div className="w-20">
                      {site.validationStatus === 'valid' && (
                        <span className="text-green-600 font-bold text-xl">✓</span>
                      )}
                      {site.validationStatus === 'invalid' && (
                        <span className="text-red-600 font-bold text-xl">✗</span>
                      )}
                    </div>
                    <span className="w-48">{site.SiteId}</span>
                    <div className="flex-1">
                      {site.validationStatus === 'valid' ? (
                        <span className="text-green-600 text-sm">Valid</span>
                      ) : (
                        <ul className="text-red-600 text-sm list-disc list-inside">
                          {site.validationIssues.map((issue, i) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {showSubmitButton && (
                <div className="flex gap-4">
                  <label htmlFor="csv-upload">
                    <div className="bg-gray-500 text-white hover:bg-gray-600 rounded p-4 cursor-pointer">
                      Fix CSV and Re-upload
                    </div>
                  </label>
                  <button 
                    onClick={handleSubmitValidRequests}
                    className="bg-green-600 text-white hover:bg-green-700 rounded p-4 cursor-pointer"
                  >
                    Submit {getValidCount()} Valid Request{getValidCount() !== 1 ? 's' : ''} →
                  </button>
                </div>
              )}

              {!showSubmitButton && (
                <label htmlFor="csv-upload">
                  <div className="bg-gray-500 text-white hover:bg-gray-600 rounded p-4 cursor-pointer">
                    Fix CSV and Re-upload
                  </div>
                </label>
              )}
            </div>
          )}

          {/* Submission Results */}
          {submissionResults.length > 0 && (
            <div className="w-full">
              <h2 className="text-xl font-bold mb-4">
                {submitting ? 'Submitting Requests...' : 'Submission Complete'}
              </h2>
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 font-semibold flex items-center gap-4">
                  <span className="w-20">Status</span>
                  <span className="flex-1">Site ID</span>
                </div>
                {submissionResults.map((site, index) => (
                  <div key={index} className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-8 border-t">
                    <div className="w-20">
                      {site.submissionStatus === 'pending' && site.validationStatus === 'invalid' && (
                        <span className="text-gray-400">-</span>
                      )}
                      {site.submissionStatus === 'skipped' && (
                        <span className="text-gray-400">Skipped</span>
                      )}
                      {site.submissionStatus === 'submitting' && (
                        <span className="w-5 h-5 border-2 border-blue-500 rounded-full animate-spin"></span>
                      )}
                      {site.submissionStatus === 'completed' && (
                        <input 
                          type="checkbox" 
                          checked
                          readOnly
                          className="w-5 h-5 text-green-600"
                        />
                      )}
                      {site.submissionStatus === 'error' && (
                        <span className="text-red-600 font-bold">✗</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div>{site.SiteId}</div>
                      {site.submissionStatus === 'error' && site.submissionError && (
                        <div className="text-red-600 text-sm mt-1">{site.submissionError}</div>
                      )}
                      {site.submissionStatus === 'skipped' && (
                        <div className="text-gray-500 text-sm mt-1">Invalid data - not submitted</div>
                      )}
                    </div>
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