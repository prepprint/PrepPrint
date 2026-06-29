import { useEffect, useRef } from 'react';

export default function AdBanner({ 
  dataAdSlot, 
  dataAdFormat = 'auto', 
  dataFullWidthResponsive = true,
  minHeight = '100px' // Default minimum height to prevent CLS
}) {
  const adRef = useRef(null);

  // Retrieve Publisher ID dynamically, supporting both Vite and Create React App pipelines
  const publisherId = 
    import.meta.env.VITE_ADSENSE_PUB_ID || 
    process.env.REACT_APP_ADSENSE_PUB_ID || 
    '';

  useEffect(() => {
    if (!publisherId) {
      console.warn('AdBanner: AdSense Publisher ID is missing from environment variables.');
      return;
    }

    // Ensure the ad only pushes if the ins element is empty to prevent duplication errors
    if (adRef.current && adRef.current.innerHTML === '') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error(
          'AdBanner: Failed to load AdSense ad. This is typical during Strict Mode double-invocations or rapid route changes.', 
          error
        );
      }
    }
  }, [publisherId, dataAdSlot]);

  if (!publisherId) return null; // Fail safely without breaking the UI

  return (
    // Tailwind wrapper ensures center alignment and bounds containment
    <div 
      className="flex justify-center w-full overflow-hidden my-4" 
      style={{ minHeight }} 
      aria-hidden="true"
    >
      <ins
        ref={adRef}
        className="adsbygoogle block w-full text-center"
        data-ad-client={publisherId}
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive={dataFullWidthResponsive.toString()}
      />
    </div>
  );
}